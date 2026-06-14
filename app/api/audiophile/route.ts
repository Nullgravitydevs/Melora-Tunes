import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync, createWriteStream, createReadStream } from 'fs';
import { join } from 'path';
import { tmpdir, homedir, platform } from 'os';

// FFmpeg setup — detect from @ffmpeg-installer/ffmpeg, then ~/.melora/, then system PATH
let ffmpegPath: string | null = null;
try {
    // 1. Primary: Use the reliable NPM installer path
    const ffmpegInstaller = require(/* webpackIgnore: true */ '@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller.path) {
        ffmpegPath = ffmpegInstaller.path;
        console.log('[Audiophile] FFmpeg found via @ffmpeg-installer:', ffmpegPath);
    }
} catch (e) {
    console.warn('[Audiophile] @ffmpeg-installer/ffmpeg not found. Falling back to manual detection.');
}

if (!ffmpegPath) {
    try {
        const { execSync } = require('child_process');

        // 2. Check ~/.melora/ directory (where our UI auto-downloader puts it)
        const meloraDir = join(homedir(), '.melora');
        const localBin = join(meloraDir, platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        if (existsSync(localBin)) {
            try {
                execSync(`"${localBin}" -version`, { timeout: 5000, stdio: 'pipe' });
                ffmpegPath = localBin;
                console.log('[Audiophile] FFmpeg found in ~/.melora/:', ffmpegPath);
            } catch { /* exists but broken */ }
        }

        // 3. Fall back to system PATH
        if (!ffmpegPath) {
            const cmd = platform() === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
            const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0].trim();
            if (result) {
                ffmpegPath = result;
                console.log('[Audiophile] FFmpeg found on system PATH:', ffmpegPath);
            }
        }
    } catch (e) {
        console.warn('[Audiophile] FFmpeg not found. 24-bit DASH downloads will fall back to LOSSLESS.');
    }
}

// Tidal proxy endpoints (loaded from ENV)
let TIDAL_APIS: string[] = [];
try {
    const endpoints = JSON.parse(process.env.NEXT_PUBLIC_TIDAL_ENDPOINTS || '[]');
    TIDAL_APIS = endpoints.map((e: any) => e.url).filter(Boolean);
} catch (e) {
    // Fallbacks if env is missing
    TIDAL_APIS = [
        'https://hifi-one.spotisaver.net',
        'https://hifi-two.spotisaver.net',
        'https://triton.squid.wtf',
    ];
}

interface ManifestResult {
    directUrl?: string;
    initUrl?: string;
    mediaUrls?: string[];
    isDash: boolean;
}

function parseManifest(manifestB64: string): ManifestResult {
    const manifestStr = Buffer.from(manifestB64, 'base64').toString('utf-8');

    // JSON manifest (BTS format) - direct single-file URL
    if (manifestStr.trim().startsWith('{')) {
        try {
            const manifest = JSON.parse(manifestStr);
            if (manifest.urls && manifest.urls.length > 0) {
                return { directUrl: manifest.urls[0], isDash: false };
            }
        } catch (e) { /* fall through */ }
    }

    // DASH XML manifest - extract init + media segment URLs
    if (manifestStr.includes('<MPD')) {
        // Check for BaseURL first (rare single-file case)
        const baseUrlMatch = manifestStr.match(/<BaseURL>(.*?)<\/BaseURL>/);
        if (baseUrlMatch) {
            return { directUrl: baseUrlMatch[1], isDash: false };
        }

        // Parse DASH segments
        const initMatch = manifestStr.match(/initialization="([^"]+)"/);
        const mediaMatch = manifestStr.match(/media="([^"]+)"/);

        if (!initMatch || !mediaMatch) {
            return { isDash: true }; // Can't parse
        }

        let initUrl = initMatch[1].replace(/&amp;/g, '&');
        const mediaTemplate = mediaMatch[1].replace(/&amp;/g, '&');

        // Count segments from <S d="..." r="..."> entries
        let segmentCount = 0;
        const segRegex = /<S\s+[^>]*>/g;
        const rRegex = /r="(\d+)"/;
        let segMatch;
        while ((segMatch = segRegex.exec(manifestStr)) !== null) {
            const rMatch = rRegex.exec(segMatch[0]);
            const repeat = rMatch ? parseInt(rMatch[1]) : 0;
            segmentCount += repeat + 1;
        }

        if (segmentCount === 0) {
            return { isDash: true }; // No segments found
        }

        const mediaUrls: string[] = [];
        for (let i = 1; i <= segmentCount; i++) {
            mediaUrls.push(mediaTemplate.replace('$Number$', String(i)));
        }

        return { initUrl, mediaUrls, isDash: true };
    }

    return { isDash: false };
}

async function downloadSegmentsToM4a(initUrl: string, mediaUrls: string[], outputPath: string): Promise<void> {
    const stream = createWriteStream(outputPath);

    // Download init segment
    console.log(`[Audiophile] Downloading init segment...`);
    const initRes = await fetch(initUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!initRes.ok) throw new Error(`Init segment failed: ${initRes.status}`);
    const initBuffer = Buffer.from(await initRes.arrayBuffer());
    stream.write(initBuffer);

    // Download media segments
    const total = mediaUrls.length;
    for (let i = 0; i < total; i++) {
        if (i % 20 === 0 || i === total - 1) {
            console.log(`[Audiophile] Downloading segment ${i + 1}/${total}...`);
        }
        const segRes = await fetch(mediaUrls[i], {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        if (!segRes.ok) throw new Error(`Segment ${i + 1} failed: ${segRes.status}`);
        const segBuffer = Buffer.from(await segRes.arrayBuffer());
        stream.write(segBuffer);
    }

    await new Promise<void>((resolve, reject) => {
        stream.end(() => resolve());
        stream.on('error', reject);
    });

    console.log(`[Audiophile] All ${total} segments written to ${outputPath}`);
}

async function convertM4aToFlac(
    m4aPath: string,
    flacPath: string,
    metadata?: { title?: string; artist?: string; album?: string; artPath?: string; lyrics?: string }
): Promise<void> {
    if (!ffmpegPath) throw new Error('FFmpeg not available');

    const { execFile } = require('child_process');
    const args = ['-y', '-i', m4aPath];

    if (metadata?.artPath && existsSync(metadata.artPath)) {
        args.push('-i', metadata.artPath);
    }

    args.push('-map', '0:a');
    if (metadata?.artPath && existsSync(metadata.artPath)) {
        args.push('-map', '1:0', '-metadata:s:v', 'title="Album cover"', '-metadata:s:v', 'comment="Cover (front)"');
    }

    if (metadata?.title) args.push('-metadata', `title=${metadata.title}`);
    if (metadata?.artist) args.push('-metadata', `artist=${metadata.artist}`);
    if (metadata?.album) args.push('-metadata', `album=${metadata.album}`);
    if (metadata?.lyrics) args.push('-metadata', `lyrics=${metadata.lyrics}`);

    args.push('-c:a', 'flac', flacPath);

    return new Promise((resolve, reject) => {
        execFile(ffmpegPath!, args, {
            timeout: 120000 // 2 min timeout
        }, (error: any, stdout: string, stderr: string) => {
            if (error) {
                console.error('[Audiophile] FFmpeg error:', stderr);
                reject(new Error(`FFmpeg conversion failed: ${error.message}`));
            } else {
                console.log('[Audiophile] FFmpeg conversion successful');
                resolve();
            }
        });
    });
}

async function fetchFromProxy(tidalId: string, quality: string): Promise<any> {
    for (const api of TIDAL_APIS) {
        try {
            const url = `${api}/track/?id=${tidalId}&quality=${quality}`;
            console.log(`[Audiophile] Trying proxy: ${api}`);
            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) {
                console.log(`[Audiophile] ${api} returned ${res.status}`);
                continue;
            }
            const data = await res.json();
            if (data?.data?.manifest) {
                console.log(`[Audiophile] ✓ Got manifest from ${api}`);
                return data;
            }
        } catch (e: any) {
            console.log(`[Audiophile] ${api} failed: ${e.message}`);
        }
    }
    return null;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const amId = searchParams.get('amId');
    const requestedQuality = searchParams.get('quality') || 'HI_RES_LOSSLESS';
    const checkOnly = searchParams.get('checkOnly') === 'true';

    // Metadata for tagging
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');
    const artUrl = searchParams.get('art');
    const songId = searchParams.get('songId');

    if (!amId && !searchParams.get('tidalId')) {
        return NextResponse.json({ error: 'Either amId or tidalId is required' }, { status: 400 });
    }

    try {
        console.log(`[Audiophile] Starting: amId=${amId}, quality=${requestedQuality}, directTidalId=${searchParams.get('tidalId')}`);

        let tidalId = searchParams.get('tidalId');

        // Step 1: Translate amId → Tidal ID via song.link (only if tidalId is not provided)
        if (!tidalId && amId && amId !== 'none') {
            const songLinkRes = await fetch(`https://api.song.link/v1-alpha.1/links?platform=appleMusic&type=song&id=${amId}`, {
                signal: AbortSignal.timeout(15000),
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });

            if (!songLinkRes.ok) {
                return NextResponse.json({ error: `song.link error: ${songLinkRes.status}` }, { status: 502 });
            }

            const songLinkData = await songLinkRes.json();
            const tidalUrl = songLinkData.linksByPlatform?.tidal?.url;

            // S3: Grab Spotify URL for potential Deezer/Yoinkify fallback
            const spotifyUrl = songLinkData.linksByPlatform?.spotify?.url;
            if (spotifyUrl) {
                console.log(`[Audiophile] Grabbed Spotify URL for fallback: ${spotifyUrl}`);
                // Attach it to the request context dynamically
                (request as any).spotifyUrlFallback = spotifyUrl;
            }

            if (!tidalUrl) {
                if (spotifyUrl) {
                    console.log(`[Audiophile] Song not on Tidal. Forcing Deezer/Spotify fallback early.`);
                    tidalId = 'none'; // Signal to skip proxy
                } else {
                    return NextResponse.json({ error: 'Song not found on Tidal or Spotify.' }, { status: 404 });
                }
            } else {
                tidalId = tidalUrl?.split('track/')[1]?.split('?')[0];
                console.log(`[Audiophile] amId ${amId} → Tidal ID: ${tidalId}`);
            }
        }

        // Step 2: Fetch manifest from proxy (skip if no Tidal ID)
        let proxyData = null;
        if (tidalId !== 'none') {
            proxyData = await fetchFromProxy(tidalId as string, requestedQuality);
        }

        if (!proxyData && tidalId !== 'none') {
            return NextResponse.json({ error: 'All proxy endpoints failed.' }, { status: 502 });
        }

        // If proxyData is null, it means we must force Yoinkify Deezer Fallback
        if (!proxyData) {
            console.log(`[Audiophile] Skipping Tidal proxy (no Tidal ID). Preparing Deezer fallback.`);
            // Mock a parsed object so it falls through to Case C / Deezer
            const parsed = { isDash: true, directUrl: undefined, initUrl: undefined, mediaUrls: undefined };
            // Simulate falling through...
        }

        const manifestB64 = proxyData?.data?.manifest || '';
        let audioQuality = proxyData?.data?.audioQuality || requestedQuality;
        let bitDepth = proxyData?.data?.bitDepth || 24;
        let sampleRate = proxyData?.data?.sampleRate || 192000;

        // Step 3: Parse manifest
        const parsed = manifestB64 ? parseManifest(manifestB64) : { isDash: true };

        // F30: If it's a pre-flight check, return what quality we actually found without downloading
        if (checkOnly) {
            // Case A: proxyData is null, but we have a spotify fallback
            if (!proxyData && (request as any).spotifyUrlFallback) {
                return NextResponse.json({
                    available: true,
                    requested: requestedQuality,
                    actual: 'LOSSLESS',
                    bitDepth: 16,
                    sampleRate: 44100,
                    isDash: false,
                    tidalId: 'none'
                });
            }

            return NextResponse.json({
                available: true,
                requested: requestedQuality,
                actual: audioQuality,
                bitDepth,
                sampleRate,
                isDash: parsed?.isDash || false,
                tidalId
            });
        }

        // Case A: Direct URL (BTS/JSON) - no stitching needed
        if (parsed.directUrl) {
            console.log(`[Audiophile] ✓ Direct URL found (no DASH). Quality: ${audioQuality}`);
            return NextResponse.json({
                url: parsed.directUrl,
                quality: audioQuality,
                bitDepth,
                sampleRate,
                method: 'direct'
            });
        }

        // Case B: DASH manifest with segments - need FFmpeg stitching
        if (parsed.isDash && parsed.initUrl && parsed.mediaUrls && parsed.mediaUrls.length > 0) {
            console.log(`[Audiophile] DASH manifest: ${parsed.mediaUrls.length} segments detected.`);

            if (!ffmpegPath) {
                // FFmpeg not available - fallback to LOSSLESS
                console.log(`[Audiophile] FFmpeg unavailable. Falling back to LOSSLESS...`);
                const fallbackData = await fetchFromProxy(tidalId as string, 'LOSSLESS');
                if (fallbackData) {
                    const fbParsed = parseManifest(fallbackData.data.manifest);
                    if (fbParsed.directUrl) {
                        return NextResponse.json({
                            url: fbParsed.directUrl,
                            quality: 'LOSSLESS',
                            bitDepth: 16,
                            sampleRate: 44100,
                            method: 'fallback-lossless'
                        });
                    }
                }
                return NextResponse.json({ error: 'FFmpeg required for 24-bit DASH tracks. Install @ffmpeg-installer/ffmpeg.' }, { status: 500 });
            }

            // FFmpeg IS available - do the full SpotiFLAC-style stitch!
            const tempDir = join(tmpdir(), 'melora-audiophile');
            if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

            const timestamp = Date.now();
            const m4aPath = join(tempDir, `${tidalId as string}_${timestamp}.m4a`);
            const flacPath = join(tempDir, `${tidalId as string}_${timestamp}.flac`);

            try {
                // Download all DASH segments into .m4a
                console.log(`[Audiophile] Downloading ${parsed.mediaUrls.length} DASH segments...`);
                await downloadSegmentsToM4a(parsed.initUrl, parsed.mediaUrls, m4aPath);

                // 2. Download Art if provided
                let artPath = '';
                if (artUrl) {
                    try {
                        const artRes = await fetch(artUrl);
                        if (artRes.ok) {
                            artPath = join(tempDir, `${tidalId as string}_${timestamp}.jpg`);
                            await writeFile(artPath, Buffer.from(await artRes.arrayBuffer()));
                        }
                    } catch (e) { }
                }

                // Fetch lyrics
                let lyricsText = undefined;
                if (songId) {
                    try {
                        const { getLyrics } = await import('@/lib/jiosaavn');
                        const l = await getLyrics(songId);
                        if (l) lyricsText = l;
                    } catch { }
                }

                // 3. Convert .m4a → .flac using FFmpeg with metadata
                console.log(`[Audiophile] Converting M4A → FLAC via FFmpeg (with metadata & lyrics)...`);
                await convertM4aToFlac(m4aPath, flacPath, {
                    title: title || undefined,
                    artist: artist || undefined,
                    album: album || undefined,
                    artPath: artPath || undefined,
                    lyrics: lyricsText
                });

                // Read the FLAC and return as streamable response
                const { createReadStream, statSync } = require('fs');
                const flacSize = statSync(flacPath).size;

                console.log(`[Audiophile] ✓ DASH stitch complete! FLAC size: ${(flacSize / 1024 / 1024).toFixed(2)} MB`);

                const stream = createReadStream(flacPath);
                const cleanup = () => {
                    try { unlink(m4aPath); } catch { }
                    try { if (artPath) unlink(artPath); } catch { }
                    try { unlink(flacPath); } catch { }
                };

                const readableStream = new ReadableStream({
                    start(controller) {
                        stream.on('data', (chunk: any) => controller.enqueue(chunk));
                        stream.on('end', () => {
                            controller.close();
                            cleanup();
                        });
                        stream.on('error', (err: any) => {
                            controller.error(err);
                            cleanup();
                        });
                    },
                    cancel() {
                        stream.destroy();
                        cleanup();
                    }
                });

                return new Response(readableStream, {
                    headers: {
                        'Content-Type': 'audio/flac',
                        'Content-Length': String(flacSize),
                        'Content-Disposition': `attachment; filename="${title || tidalId}.flac"`,
                        'X-Audio-Quality': audioQuality,
                        'X-Bit-Depth': String(bitDepth),
                        'X-Sample-Rate': String(sampleRate),
                        'X-Method': 'dash-stitched',
                    }
                });

            } catch (stitchError: any) {
                // Stitch failed - clean up and try LOSSLESS fallback
                console.error(`[Audiophile] DASH stitch failed:`, stitchError.message);
                try { await unlink(m4aPath); } catch { }
                try { await unlink(flacPath); } catch { }

                console.log(`[Audiophile] Falling back to LOSSLESS...`);
                const fallbackData = await fetchFromProxy(tidalId as string, 'LOSSLESS');
                if (fallbackData) {
                    const fbParsed = parseManifest(fallbackData.data.manifest);
                    if (fbParsed.directUrl) {
                        return NextResponse.json({
                            url: fbParsed.directUrl,
                            quality: 'LOSSLESS',
                            bitDepth: 16,
                            sampleRate: 44100,
                            method: 'fallback-lossless'
                        });
                    }
                }
                return NextResponse.json({ error: `DASH stitch failed and no LOSSLESS fallback available.` }, { status: 500 });
            }
        }

        // Case C: DASH manifest but couldn't parse segments
        if (parsed?.isDash) {
            console.log(`[Audiophile] DASH manifest but couldn't parse segments. Trying LOSSLESS fallback...`);
            const fallbackData = await fetchFromProxy(tidalId as string, 'LOSSLESS');
            if (fallbackData) {
                const fbParsed = parseManifest(fallbackData.data.manifest);
                if (fbParsed.directUrl) {
                    return NextResponse.json({
                        url: fbParsed.directUrl,
                        quality: 'LOSSLESS',
                        bitDepth: 16,
                        sampleRate: 44100,
                        method: 'fallback-lossless',
                        title: title || undefined,
                        artist: artist || undefined,
                        album: album || undefined,
                        art: artUrl || undefined,
                    });
                }
            }
        }

        // S3: Final Deezer (Yoinkify) Fallback if EVERYTHING above failed
        const spotifyFallbackUrl = searchParams.get('spotifyUrl') || (request as any).spotifyUrlFallback;
        if (spotifyFallbackUrl) {
            console.log(`[Audiophile] All Tidal attempts failed. Engaging Deezer Yoinkify fallback...`);
            try {
                const yoinkRes = await fetch('https://yoinkify.lol/api/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                    body: JSON.stringify({
                        url: spotifyFallbackUrl,
                        format: 'flac',
                        genreSource: 'spotify'
                    }),
                    signal: AbortSignal.timeout(60000), // 60s timeout since it might take a moment to stream
                });

                if (yoinkRes.ok && yoinkRes.body) {
                    console.log(`[Audiophile] ✓ Deezer stream secured! Size unknown, piping directly.`);
                    return new Response(yoinkRes.body as any, {
                        headers: {
                            'Content-Type': 'audio/flac',
                            'Content-Disposition': `attachment; filename="${title || 'fallback'}.flac"`,
                            'X-Audio-Quality': 'LOSSLESS',
                            'X-Bit-Depth': '16',
                            'X-Sample-Rate': '44100',
                            'X-Method': 'deezer-yoinkify-fallback',
                        }
                    });
                }
            } catch (fallbackErr: any) {
                console.warn(`[Audiophile] Yoinkify fallback also failed: ${fallbackErr.message}`);
            }
        }

        return NextResponse.json({ error: 'Could not resolve a playable audio stream from any proxy.' }, { status: 500 });

    } catch (error: any) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            return NextResponse.json({ error: 'Request timed out.' }, { status: 504 });
        }
        console.error('[Audiophile] CRITICAL:', error);
        return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
    }
}
