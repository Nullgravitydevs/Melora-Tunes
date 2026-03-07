import { NextResponse } from 'next/server';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir, platform } from 'os';
import { execFile } from 'child_process';

// FFmpeg setup — detect from @ffmpeg-installer/ffmpeg, then ~/.melora/
let ffmpegPath: string | null = null;
try {
    const ffmpegInstaller = require(/* webpackIgnore: true */ '@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller.path) {
        ffmpegPath = ffmpegInstaller.path;
    }
} catch (e) { }

if (!ffmpegPath) {
    try {
        const meloraDir = join(homedir(), '.melora');
        const localBin = join(meloraDir, platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        if (existsSync(localBin)) {
            ffmpegPath = localBin;
        }
    } catch (e) { }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const downloadUrl = searchParams.get('url');
    const title = searchParams.get('title');
    const artist = searchParams.get('artist');
    const album = searchParams.get('album');
    const artUrl = searchParams.get('art');
    const songId = searchParams.get('songId');

    if (!downloadUrl) {
        return NextResponse.json({ error: 'Missing download URL' }, { status: 400 });
    }

    // Case 1: Simple Proxy (No metadata or no ffmpeg)
    if (!ffmpegPath || (!title && !artist && !album && !artUrl)) {
        try {
            const response = await fetch(downloadUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' }
            });

            if (!response.ok) return NextResponse.json({ error: 'Source fetch failed' }, { status: 502 });

            return new NextResponse(response.body, {
                headers: {
                    'Content-Type': response.headers.get('Content-Type') || 'audio/flac',
                    'Content-Length': response.headers.get('Content-Length') || '',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    'Content-Disposition': `attachment; filename="audio.flac"`,
                }
            });
        } catch (error) {
            return NextResponse.json({ error: 'Proxying failed' }, { status: 500 });
        }
    }

    // Case 2: Metadata Embedding via FFmpeg
    const tempDir = join(tmpdir(), 'melora-tagger');
    if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });

    const timestamp = Date.now();
    const inputPath = join(tempDir, `input_${timestamp}.flac`);
    const artPath = join(tempDir, `art_${timestamp}.jpg`);
    const outputPath = join(tempDir, `output_${timestamp}.flac`);

    try {
        console.log(`[Tagger] Downloading source: ${downloadUrl}`);
        const sourceRes = await fetch(downloadUrl);
        if (!sourceRes.ok) throw new Error('Failed to download source audio');
        await writeFile(inputPath, Buffer.from(await sourceRes.arrayBuffer()));

        let hasArt = false;
        if (artUrl) {
            try {
                const artRes = await fetch(artUrl);
                if (artRes.ok) {
                    await writeFile(artPath, Buffer.from(await artRes.arrayBuffer()));
                    hasArt = true;
                }
            } catch (e) {
                console.warn('[Tagger] Art download failed', e);
            }
        }

        const args = ['-y', '-i', inputPath];
        if (hasArt) args.push('-i', artPath);

        args.push('-map', '0:a');
        if (hasArt) args.push('-map', '1:0', '-metadata:s:v', 'title="Album cover"', '-metadata:s:v', 'comment="Cover (front)"');

        if (title) args.push('-metadata', `title=${title}`);
        if (artist) args.push('-metadata', `artist=${artist}`);
        if (album) args.push('-metadata', `album=${album}`);

        if (songId) {
            try {
                const { getLyrics } = await import('@/lib/jiosaavn');
                const lyricsText = await getLyrics(songId);
                if (lyricsText) {
                    args.push('-metadata', `lyrics=${lyricsText}`);
                }
            } catch (e) {
                console.warn('[Tagger] Failed to fetch lyrics', e);
            }
        }

        // Ensure FLAC output
        args.push('-c:a', 'flac', outputPath);

        console.log(`[Tagger] Running ffmpeg with args: ${args.join(' ')}`);

        await new Promise<void>((resolve, reject) => {
            execFile(ffmpegPath!, args, (error: any, stdout: string, stderr: string) => {
                if (error) reject(error);
                else resolve();
            });
        });

        const { readFileSync, statSync } = require('fs');
        const buffer = readFileSync(outputPath);
        const size = statSync(outputPath).size;

        // Cleanup
        try { unlink(inputPath); unlink(artPath); unlink(outputPath); } catch { }

        return new Response(buffer, {
            headers: {
                'Content-Type': 'audio/flac',
                'Content-Length': String(size),
                'Content-Disposition': `attachment; filename="${title || 'audio'}.flac"`,
            }
        });

    } catch (error: any) {
        console.error('[Tagger] Error:', error);
        // Fallback to simple proxy logic on error... or just return error
        return NextResponse.json({ error: `Tagging failed: ${error.message}` }, { status: 500 });
    }
}
