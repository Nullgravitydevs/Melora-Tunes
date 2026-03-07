"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Download as DownloadIcon, AlertCircle, Disc3, Music2, HardDrive, X } from "lucide-react";
import { useUI } from "@/components/providers/playback-context";
import { generateJioSaavnMetaFromApple } from "../../../../lib/audiophile-utils";
import { OfflineStore } from "@/lib/offline-store";

type QualityOption = 'HI_RES_LOSSLESS' | 'LOSSLESS' | 'HIGH';
type SearchMode = 'song' | 'album' | 'playlist';

const QUALITY_OPTIONS: { value: QualityOption; label: string; badge: string; color: string }[] = [
    { value: 'HI_RES_LOSSLESS', label: '24-bit / 192kHz', badge: 'MASTER', color: 'amber' },
    { value: 'LOSSLESS', label: '16-bit / 44.1kHz', badge: 'LOSSLESS', color: 'cyan' },
    { value: 'HIGH', label: '320kbps AAC', badge: 'HIGH', color: 'emerald' },
];

export function AudiophileSearch() {
    const { showToast } = useUI();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [albumResults, setAlbumResults] = useState<any[]>([]);
    const [albumTracks, setAlbumTracks] = useState<{ albumId: string; tracks: any[] } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<{ id: string; stage: string; percent?: number } | null>(null);
    const [selectedQuality, setSelectedQuality] = useState<QualityOption>('HI_RES_LOSSLESS');
    const [searchMode, setSearchMode] = useState<SearchMode>('song');

    // Album/Playlist bulk download state
    const [albumDownloading, setAlbumDownloading] = useState(false);
    const [albumProgress, setAlbumProgress] = useState<{ current: number; total: number; name: string } | null>(null);

    // FFmpeg setup state
    const [ffmpegInstalled, setFfmpegInstalled] = useState<boolean | null>(null); // null = checking
    const [showFFmpegModal, setShowFFmpegModal] = useState(false);
    const [ffmpegInstalling, setFfmpegInstalling] = useState(false);
    const [ffmpegInstallStatus, setFfmpegInstallStatus] = useState('');
    const [pendingDownloadTrack, setPendingDownloadTrack] = useState<any>(null);
    const [ffmpegProgress, setFfmpegProgress] = useState(0);

    // Check FFmpeg status on mount
    useEffect(() => {
        checkFFmpegStatus();
    }, []);

    const checkFFmpegStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/ffmpeg?action=status');
            const data = await res.json();
            setFfmpegInstalled(data.installed);
            if (data.installed) {
                console.log(`[Audiophile] FFmpeg ready (${data.source}): ${data.path}`);
            }
        } catch {
            setFfmpegInstalled(false);
        }
    }, []);

    const handleFFmpegInstall = async () => {
        setFfmpegInstalling(true);
        setFfmpegInstallStatus('Starting download...');
        setFfmpegProgress(0);

        // Poll progress every 1s
        const poller = setInterval(async () => {
            try {
                const res = await fetch('/api/ffmpeg?action=progress');
                const data = await res.json();
                if (data.active) {
                    setFfmpegProgress(data.percent);
                    const stageText: Record<string, string> = {
                        downloading: `Downloading... ${data.downloadedMB} / ${data.totalMB} MB (${data.percent}%)`,
                        extracting: 'Extracting audio processor...',
                        verifying: 'Verifying installation...',
                    };
                    setFfmpegInstallStatus(stageText[data.stage] || data.stage);
                }
            } catch { /* ignore poll errors */ }
        }, 1000);

        try {
            const res = await fetch('/api/ffmpeg?action=download');
            clearInterval(poller);
            const data = await res.json();
            if (data.success) {
                setFfmpegInstalled(true);
                setFfmpegProgress(100);
                setFfmpegInstallStatus('Done!');
                setTimeout(() => {
                    setShowFFmpegModal(false);
                    showToast('✓ Audio processor installed! 24-bit downloads ready.', 'success');
                    // Auto-retry the pending download
                    if (pendingDownloadTrack) {
                        const track = pendingDownloadTrack;
                        setPendingDownloadTrack(null);
                        setTimeout(() => handleDownload(track), 500);
                    }
                }, 800);
            } else {
                throw new Error(data.error || 'Installation failed');
            }
        } catch (error: any) {
            clearInterval(poller);
            setFfmpegInstallStatus(`Failed: ${error.message}`);
            showToast(`Installation failed: ${error.message}`, 'error');
        } finally {
            setFfmpegInstalling(false);
        }
    };

    const handlePlaylistImport = async (url: string) => {
        if (!url.includes('music.apple.com')) {
            showToast("Please paste a valid Apple Music playlist URL.", "error");
            return;
        }

        setIsSearching(true);
        setResults([]);
        setAlbumResults([]);
        setAlbumTracks(null);

        try {
            const res = await fetch(`/api/audiophile-playlist?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setResults(data.tracks);
            showToast(`✓ Imported ${data.tracks.length} tracks from playlist.`, "success");
        } catch (error: any) {
            showToast(`Import failed: ${error.message}`, "error");
        } finally {
            setIsSearching(false);
        }
    };

    const formatTidalImage = (coverId: string) => {
        if (!coverId) return '';
        if (coverId.startsWith('http')) return coverId;
        return `https://resources.tidal.com/images/${coverId.replace(/-/g, '/')}/640x640.jpg`;
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        if (searchMode === 'playlist') {
            handlePlaylistImport(query);
            return;
        }

        setIsSearching(true);
        setResults([]);
        setAlbumResults([]);
        setAlbumTracks(null);

        try {
            if (searchMode === 'song') {
                const res = await fetch(`/api/audiophile-search?q=${encodeURIComponent(query)}&type=song`);
                const data = await res.json();
                if (data.results) {
                    const mapped = data.results.map((t: any) => ({
                        trackId: t.id,
                        trackName: t.title,
                        artistName: t.artist?.name || 'Unknown',
                        collectionName: t.album?.title || '',
                        artworkUrl100: formatTidalImage(t.album?.cover || t.cover),
                        trackTimeMillis: (t.duration || 0) * 1000
                    }));
                    setResults(mapped);
                }
            } else if (searchMode === 'album') {
                const res = await fetch(`/api/audiophile-search?q=${encodeURIComponent(query)}&type=album`);
                const data = await res.json();
                if (data.results) {
                    const mapped = data.results.map((a: any) => ({
                        collectionId: a.id,
                        collectionName: a.title,
                        artistName: a.artist?.name || 'Unknown',
                        artworkUrl100: formatTidalImage(a.cover),
                        trackCount: a.numberOfTracks || a.numTracks || 0
                    }));
                    setAlbumResults(mapped);
                }
            }
        } catch (error) {
            showToast("Failed to search. Check connection.", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const handleAlbumClick = async (album: any) => {
        try {
            setIsSearching(true);
            // Tidal proxy album track fetch
            const res = await fetch(`/api/audiophile-search?q=${album.collectionId}&type=album_tracks`);
            const data = await res.json();

            // If proxy doesn't support album track fetch yet, gracefully fail or if proxy added it:
            if (data.results) {
                const mapped = data.results.map((t: any) => ({
                    trackId: t.id,
                    trackName: t.title,
                    artistName: t.artist?.name || t.artists?.[0]?.name || album.artistName,
                    collectionName: album.collectionName,
                    artworkUrl100: album.artworkUrl100,
                    trackTimeMillis: (t.duration || 0) * 1000
                }));
                setAlbumTracks({ albumId: album.collectionId, tracks: mapped });
            } else {
                showToast("Album track listing not supported by this proxy yet.", "error");
            }
        } catch (e) {
            showToast("Failed to load album tracks.", "error");
        } finally {
            setIsSearching(false);
        }
    };

    const handleDownload = async (track: any, qualityOverride?: QualityOption) => {
        const amId = track.trackId;
        const quality = qualityOverride || selectedQuality;

        // FFmpeg check for 24-bit downloads
        if (quality === 'HI_RES_LOSSLESS' && !ffmpegInstalled) {
            setPendingDownloadTrack(track);
            setShowFFmpegModal(true);
            return;
        }

        setDownloadingId(String(amId));
        setDownloadProgress({ id: String(amId), stage: 'Checking availability...', percent: 0 });

        try {
            let resolvedTidalId: string | null = String(track.trackId); // Natively Tidal!

            // F30: Pre-flight Check to verify Tidal quality matches user requested quality
            const checkParams = new URLSearchParams({ amId: 'none', tidalId: resolvedTidalId, quality, checkOnly: 'true' });
            const checkRes = await fetch(`/api/audiophile?${checkParams.toString()}`);
            if (checkRes.ok) {
                const checkData = await checkRes.json();

                if (checkData.tidalId) {
                    resolvedTidalId = checkData.tidalId;
                }

                if (checkData.available && checkData.actual && checkData.actual !== quality) {
                    // Downgrade detected
                    let confirmMessage = '';
                    if (quality === 'HI_RES_LOSSLESS' && ['LOSSLESS', 'HIGH'].includes(checkData.actual)) {
                        confirmMessage = `24-bit MASTER is not available for "${track.trackName}".\n\nThe highest available quality is ${checkData.actual === 'LOSSLESS' ? '16-bit FLAC' : '320kbps'}.\n\nDo you want to download this version instead?`;
                    } else if (quality === 'LOSSLESS' && checkData.actual === 'HIGH') {
                        confirmMessage = `16-bit FLAC is not available for "${track.trackName}".\n\nOnly 320kbps is available.\n\nDo you want to download it anyway?`;
                    }

                    if (confirmMessage && !window.confirm(confirmMessage)) {
                        setDownloadingId(null);
                        setDownloadProgress(null);
                        return;
                    }
                }
            }

            setDownloadProgress({ id: String(amId), stage: 'Translating ID...', percent: 0 });

            // 1. Get stream URL via our API (now with quality param + DASH stitching + Metadata for tagging)
            const params = new URLSearchParams({
                amId: 'none',
                quality,
                title: track.trackName || '',
                artist: track.artistName || '',
                album: track.collectionName || '',
                art: track.artworkUrl100?.replace('100x100bb', '600x600bb') || ''
            });

            if (resolvedTidalId) {
                params.append('tidalId', resolvedTidalId);
            }

            const res = await fetch(`/api/audiophile?${params.toString()}`);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errData.error || "Failed to resolve FLAC stream");
            }

            const contentType = res.headers.get('content-type') || '';

            // Check if the response IS the stitched FLAC file directly (DASH stitched)
            if (contentType.includes('audio/flac') || contentType.includes('application/octet-stream')) {
                setDownloadProgress({ id: String(amId), stage: 'Receiving stitched FLAC...', percent: 0 });
                const blob = await streamResponseToBlob(res, String(amId), 'audio/flac');
                const method = res.headers.get('x-method') || 'dash-stitched';
                const bitDepth = res.headers.get('x-bit-depth') || '24';
                const sampleRate = res.headers.get('x-sample-rate') || '192000';

                setDownloadProgress({ id: String(amId), stage: 'Saving to library...', percent: 100 });
                const meta = generateJioSaavnMetaFromApple(track);
                const qualityLabel = parseInt(bitDepth) >= 24 ? 'hires' : 'flac';
                await OfflineStore.saveSong(meta, blob, qualityLabel);

                showToast(`✓ ${track.trackName} — ${bitDepth}-bit/${(parseInt(sampleRate) / 1000).toFixed(1)}kHz FLAC`, "success");
                window.dispatchEvent(new CustomEvent('melora-offline-changed', { detail: { songId: meta.id, status: 'downloaded' } }));
                return;
            }

            // JSON response = direct URL (no DASH stitching needed)
            const data = await res.json();
            const flacUrl = data.url;

            setDownloadProgress({ id: String(amId), stage: 'Downloading audio...', percent: 0 });

            // 2. Fetch via CORS proxy (with Metadata for tagging)
            const proxyParams = new URLSearchParams({
                url: flacUrl,
                title: track.trackName || '',
                artist: track.artistName || '',
                album: track.collectionName || '',
                art: track.artworkUrl100?.replace('100x100bb', '600x600bb') || ''
            });
            const proxyUrl = `/api/audiophile-download?${proxyParams.toString()}`;
            const audioRes = await fetch(proxyUrl);
            if (!audioRes.ok) throw new Error(`Audio download failed (${audioRes.status})`);

            const blob = await streamResponseToBlob(audioRes, String(amId), 'audio/flac');

            setDownloadProgress({ id: String(amId), stage: 'Saving to library...', percent: 100 });
            const meta = generateJioSaavnMetaFromApple(track);
            const qualityLabel = data.bitDepth >= 24 ? 'hires' : (data.quality === 'LOSSLESS' ? 'flac' : '320');
            await OfflineStore.saveSong(meta, blob, qualityLabel);

            const qualityText = data.bitDepth >= 24
                ? `${data.bitDepth}-bit/${(data.sampleRate / 1000).toFixed(1)}kHz`
                : data.quality === 'LOSSLESS' ? '16-bit/44.1kHz CD' : '320kbps';
            showToast(`✓ ${track.trackName} — ${qualityText}`, "success");
            window.dispatchEvent(new CustomEvent('melora-offline-changed', { detail: { songId: meta.id, status: 'downloaded' } }));

        } catch (error: any) {
            console.error("Audiophile Download Error:", error);
            showToast(error.message || "Download failed.", "error");
        } finally {
            setDownloadingId(null);
            setDownloadProgress(null);
        }
    };

    const handleAlbumDownload = async (tracks: any[]) => {
        setAlbumDownloading(true);
        let success = 0;
        for (let i = 0; i < tracks.length; i++) {
            setAlbumProgress({ current: i + 1, total: tracks.length, name: tracks[i].trackName });
            try {
                await handleDownload(tracks[i]);
                success++;
            } catch { /* continue */ }
        }
        setAlbumDownloading(false);
        setAlbumProgress(null);
        showToast(`Bulk download complete! ${success}/${tracks.length} tracks saved.`, "success");
    };

    // Helper: stream a Response body into a Blob with progress tracking
    async function streamResponseToBlob(response: Response, trackId: string, mimeType: string): Promise<Blob> {
        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let received = 0;
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    chunks.push(value);
                    received += value.length;
                    const mb = (received / 1024 / 1024).toFixed(1);
                    const pct = total > 0 ? Math.round((received / total) * 100) : undefined;
                    setDownloadProgress({ id: trackId, stage: `Downloading (${mb}MB)`, percent: pct });
                }
            }
        }

        return new Blob(chunks.map(c => c.buffer as ArrayBuffer), { type: mimeType });
    }

    const qualityConfig = QUALITY_OPTIONS.find(q => q.value === selectedQuality)!;

    return (
        <div className="w-full">
            {/* FFmpeg Setup Modal */}
            <AnimatePresence>
                {showFFmpegModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => !ffmpegInstalling && setShowFFmpegModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#1a1a2e] border border-amber-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                        <HardDrive size={20} className="text-amber-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">24-bit Hi-Res Setup</h3>
                                </div>
                                {!ffmpegInstalling && (
                                    <button onClick={() => setShowFFmpegModal(false)} className="text-white/30 hover:text-white/60">
                                        <X size={20} />
                                    </button>
                                )}
                            </div>

                            <p className="text-white/60 text-sm leading-relaxed mb-4">
                                24-bit Master quality songs are delivered in small audio pieces. Melora needs
                                a <strong className="text-amber-400">one-time audio processor</strong> download
                                to assemble these pieces into a single Hi-Res FLAC file.
                            </p>

                            <div className="bg-white/5 rounded-xl p-3 mb-4 text-xs text-white/40">
                                <p>📦 Size: ~200MB (one-time download)</p>
                                <p className="mt-1">📁 Saves to your Melora data folder</p>
                                <p className="mt-1">✅ Works on Windows, Mac, and Linux</p>
                            </div>

                            {ffmpegInstalling ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                                        <span className="text-amber-400 text-sm font-medium">{ffmpegInstallStatus}</span>
                                    </div>
                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                                            style={{
                                                width: ffmpegProgress > 0 ? `${Math.min(ffmpegProgress, 100)}%` : '100%',
                                                animation: ffmpegProgress === 0 ? 'pulse 2s infinite' : 'none'
                                            }} />
                                    </div>
                                    <p className="text-white/30 text-xs">This may take 1-3 minutes depending on your connection.</p>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFFmpegInstall}
                                        className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-colors text-sm"
                                    >
                                        Download & Install (~200MB)
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowFFmpegModal(false);
                                            if (pendingDownloadTrack) {
                                                handleDownload(pendingDownloadTrack, 'LOSSLESS');
                                                setPendingDownloadTrack(null);
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 font-bold rounded-xl transition-colors text-sm"
                                    >
                                        16-bit instead
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Quality Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                {QUALITY_OPTIONS.map((opt) => {
                    const isSelected = selectedQuality === opt.value;
                    const colors: Record<string, string> = {
                        amber: isSelected ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-white/5 border-white/10 text-white/40 hover:border-amber-500/30 hover:text-amber-400/60',
                        cyan: isSelected ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white/40 hover:border-cyan-500/30 hover:text-cyan-400/60',
                        emerald: isSelected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40 hover:border-emerald-500/30 hover:text-emerald-400/60',
                    };
                    return (
                        <button
                            key={opt.value}
                            onClick={() => setSelectedQuality(opt.value)}
                            className={`px-4 py-2 rounded-full border text-sm font-bold transition-all ${colors[opt.color]}`}
                        >
                            {opt.badge} <span className="font-normal opacity-70 ml-1">{opt.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Search Mode Toggle + Search Bar */}
            <div className="flex gap-2 mb-6">
                <div className="flex bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    <button
                        onClick={() => { setSearchMode('song'); setAlbumResults([]); setAlbumTracks(null); setResults([]) }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-all ${searchMode === 'song' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Music2 size={16} /> Songs
                    </button>
                    <button
                        onClick={() => { setSearchMode('album'); setResults([]); setAlbumTracks(null); }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-all ${searchMode === 'album' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Disc3 size={16} /> Albums
                    </button>
                    <button
                        onClick={() => { setSearchMode('playlist'); setResults([]); setAlbumResults([]); setAlbumTracks(null); }}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-all ${searchMode === 'playlist' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'}`}
                    >
                        <Music size={16} /> Playlists
                    </button>
                </div>

                <form onSubmit={handleSearch} className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={
                            searchMode === 'song' ? "Search songs... e.g. 'Blinding Lights'" :
                                searchMode === 'album' ? "Search albums... e.g. 'After Hours'" :
                                    "Paste Apple Music Playlist URL..."
                        }
                        className="w-full pl-10 pr-24 py-3 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-amber-500/50 text-white placeholder-white/30 transition-all font-medium"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <button
                        type="submit"
                        disabled={isSearching || !query.trim()}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 font-bold rounded-lg transition-colors text-sm ${selectedQuality === 'HI_RES_LOSSLESS' ? 'bg-amber-500 hover:bg-amber-400 text-black'
                            : selectedQuality === 'LOSSLESS' ? 'bg-cyan-500 hover:bg-cyan-400 text-black'
                                : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                            } disabled:opacity-50`}
                    >
                        {isSearching ? "..." : searchMode === 'playlist' ? "Import" : "Search"}
                    </button>
                </form>
            </div>

            {/* Album/Playlist Bulk Download Bar */}
            {albumDownloading && albumProgress && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                    <span className="text-amber-400 font-bold text-sm">
                        Downloading track {albumProgress.current}/{albumProgress.total}: {albumProgress.name}
                    </span>
                </div>
            )}

            {searchMode === 'playlist' && results.length > 0 && !albumDownloading && (
                <div className="mb-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                    <div className="text-sm">
                        <span className="text-white/40">Imported </span>
                        <span className="text-white font-bold">{results.length} tracks</span>
                    </div>
                    <button
                        onClick={() => handleAlbumDownload(results)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/10 transition-all"
                    >
                        <DownloadIcon size={14} /> Download All
                    </button>
                </div>
            )}

            {/* Song Results (or Playlist Items) */}
            <div className="space-y-2">
                <AnimatePresence>
                    {results.map((track, i) => (
                        <TrackRow
                            key={track.trackId}
                            track={track}
                            index={i}
                            isDownloading={downloadingId === String(track.trackId)}
                            progress={downloadProgress?.id === String(track.trackId) ? downloadProgress : null}
                            quality={selectedQuality}
                            qualityColor={qualityConfig.color}
                            onDownload={() => handleDownload(track)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Album Results */}
            {albumResults.length > 0 && !albumTracks && searchMode === 'album' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {albumResults.map((album, i) => (
                        <motion.button
                            key={album.collectionId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => handleAlbumClick(album)}
                            className="group text-left"
                        >
                            <img
                                src={album.artworkUrl100?.replace('100x100bb', '300x300bb')}
                                alt={album.collectionName}
                                className="w-full aspect-square rounded-xl object-cover mb-2 group-hover:ring-2 ring-amber-500/50 transition-all"
                            />
                            <p className="text-white font-bold text-sm truncate">{album.collectionName}</p>
                            <p className="text-white/40 text-xs truncate">{album.artistName} • {album.trackCount} tracks</p>
                        </motion.button>
                    ))}
                </div>
            )}

            {/* Album Track List (after clicking an album) */}
            {albumTracks && searchMode === 'album' && (
                <div>
                    <div className="flex items-center justify-between mb-4 mt-4">
                        <button onClick={() => setAlbumTracks(null)} className="text-white/50 hover:text-white text-sm">
                            ← Back to albums
                        </button>
                        <button
                            onClick={() => handleAlbumDownload(albumTracks.tracks)}
                            disabled={albumDownloading}
                            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full transition-colors disabled:opacity-50 text-sm"
                        >
                            <DownloadIcon size={16} />
                            Download Album ({albumTracks.tracks.length} tracks)
                        </button>
                    </div>
                    <div className="space-y-2">
                        {albumTracks.tracks.map((track, i) => (
                            <TrackRow
                                key={track.trackId}
                                track={track}
                                index={i}
                                isDownloading={downloadingId === String(track.trackId)}
                                progress={downloadProgress?.id === String(track.trackId) ? downloadProgress : null}
                                quality={selectedQuality}
                                qualityColor={qualityConfig.color}
                                onDownload={() => handleDownload(track)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {!isSearching && results.length === 0 && albumResults.length === 0 && !albumTracks && query && (
                <div className="text-center py-20">
                    <p className="text-white/40">No results found for "{query}"</p>
                </div>
            )}
        </div>
    );
}

// Extracted Track Row component for reuse
function TrackRow({ track, index, isDownloading, progress, quality, qualityColor, onDownload }: {
    track: any; index: number; isDownloading: boolean;
    progress: { id: string; stage: string; percent?: number } | null;
    quality: QualityOption; qualityColor: string; onDownload: () => void;
}) {
    const durationMs = track.trackTimeMillis || 0;
    const mins = Math.floor(durationMs / 60000);
    const secs = Math.floor((durationMs % 60000) / 1000);

    const btnColors: Record<string, string> = {
        amber: isDownloading ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-500',
        cyan: isDownloading ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400' : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-500',
        emerald: isDownloading ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-500',
    };

    const badgeLabel = quality === 'HI_RES_LOSSLESS' ? 'MASTER' : quality === 'LOSSLESS' ? 'FLAC' : '320';

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="glass-card flex items-center gap-3 p-2.5 pr-3 rounded-xl group hover:border-white/20 overflow-hidden relative"
        >
            {isDownloading && progress?.percent !== undefined && (
                <div
                    className="absolute left-0 top-0 bottom-0 bg-amber-500/5 z-0 transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                />
            )}

            <img
                src={track.artworkUrl100?.replace('100x100bb', '300x300bb')}
                alt={track.trackName}
                className="w-12 h-12 rounded-md object-cover relative z-10"
            />

            <div className="flex-1 min-w-0 relative z-10">
                <p className="font-bold text-white truncate text-sm">{track.trackName}</p>
                {isDownloading && progress ? (
                    <p className="text-xs text-amber-400 truncate font-mono">
                        {progress.stage} {progress.percent !== undefined ? `[${progress.percent}%]` : ''}
                    </p>
                ) : (
                    <p className="text-xs text-white/40 truncate">{track.artistName} • {track.collectionName}</p>
                )}
            </div>

            <span className="text-white/30 text-xs font-mono relative z-10">{mins}:{secs.toString().padStart(2, '0')}</span>

            <button
                onClick={onDownload}
                disabled={isDownloading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all relative z-10 text-xs border ${btnColors[qualityColor]}`}
            >
                {isDownloading ? (
                    <>
                        <div className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        <span>Working</span>
                    </>
                ) : (
                    <>
                        <DownloadIcon size={14} />
                        <span>{badgeLabel}</span>
                    </>
                )}
            </button>
        </motion.div>
    );
}
