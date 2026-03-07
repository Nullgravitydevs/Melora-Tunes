import { NextResponse } from 'next/server';
import { existsSync, createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform, arch } from 'os';
import { execSync } from 'child_process';

// FFmpeg binary download URLs (same source as SpotiFLAC)
const FFMPEG_URLS: Record<string, string> = {
    'win32-x64': 'https://github.com/afkarxyz/ffmpeg-binaries/releases/download/v8.0/ffmpeg-windows-amd64.zip',
    'linux-x64': 'https://github.com/afkarxyz/ffmpeg-binaries/releases/download/v8.0/ffmpeg-linux-amd64.tar.xz',
    'darwin-arm64': 'https://github.com/afkarxyz/ffmpeg-binaries/releases/download/v8.0/ffmpeg-macos-arm64.zip',
    'darwin-x64': 'https://github.com/afkarxyz/ffmpeg-binaries/releases/download/v8.0/ffmpeg-macos-intel.zip',
};

function getMeloraDir(): string {
    return join(homedir(), '.melora');
}

function getFFmpegBinaryName(): string {
    return platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

function getLocalFFmpegPath(): string {
    return join(getMeloraDir(), getFFmpegBinaryName());
}

// Global download progress tracking (in-memory, resets on server restart)
let downloadState = {
    active: false,
    downloaded: 0,
    total: 0,
    stage: 'idle', // idle | downloading | extracting | verifying | done | error
    error: '',
};

/**
 * Check if FFmpeg is installed — first in ~/.melora/, then on system PATH
 */
function detectFFmpeg(): { installed: boolean; path: string | null; source: string } {
    // 1. Check local ~/.melora/ directory
    const localPath = getLocalFFmpegPath();
    if (existsSync(localPath)) {
        try {
            execSync(`"${localPath}" -version`, { timeout: 5000, stdio: 'pipe' });
            return { installed: true, path: localPath, source: 'melora-local' };
        } catch { /* binary exists but broken, continue */ }
    }

    // 2. Check system PATH
    try {
        const cmd = platform() === 'win32' ? 'where ffmpeg' : 'which ffmpeg';
        const systemPath = execSync(cmd, { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0].trim();
        if (systemPath) {
            try {
                execSync(`"${systemPath}" -version`, { timeout: 5000, stdio: 'pipe' });
                return { installed: true, path: systemPath, source: 'system-path' };
            } catch { /* found but broken */ }
        }
    } catch { /* not on PATH */ }

    return { installed: false, path: null, source: 'none' };
}

/**
 * GET /api/ffmpeg?action=status — Check FFmpeg installation status
 * GET /api/ffmpeg?action=progress — Get current download progress
 * GET /api/ffmpeg?action=download — Download and install FFmpeg
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
        const status = detectFFmpeg();
        return NextResponse.json(status);
    }

    if (action === 'progress') {
        const downloadedMB = (downloadState.downloaded / 1024 / 1024).toFixed(1);
        const totalMB = (downloadState.total / 1024 / 1024).toFixed(1);
        const percent = downloadState.total > 0 ? Math.round((downloadState.downloaded / downloadState.total) * 100) : 0;
        return NextResponse.json({
            active: downloadState.active,
            downloaded: downloadState.downloaded,
            total: downloadState.total,
            downloadedMB,
            totalMB,
            percent,
            stage: downloadState.stage,
            error: downloadState.error,
        });
    }

    if (action === 'download') {
        const platformKey = `${platform()}-${arch()}`;
        const downloadUrl = FFMPEG_URLS[platformKey];

        if (!downloadUrl) {
            return NextResponse.json(
                { error: `Unsupported platform: ${platformKey}. Supported: ${Object.keys(FFMPEG_URLS).join(', ')}` },
                { status: 400 }
            );
        }

        // Already installed?
        const current = detectFFmpeg();
        if (current.installed) {
            return NextResponse.json({ success: true, message: 'Already installed', path: current.path });
        }

        // Already downloading?
        if (downloadState.active) {
            return NextResponse.json({ success: true, message: 'Download already in progress', started: false });
        }

        const meloraDir = getMeloraDir();
        if (!existsSync(meloraDir)) {
            mkdirSync(meloraDir, { recursive: true });
        }

        // Start background download
        downloadState = { active: true, downloaded: 0, total: 0, stage: 'downloading', error: '' };
        console.log(`[FFmpeg] Starting background download from: ${downloadUrl}`);

        // Fire and forget async function
        (async () => {
            try {
                const response = await fetch(downloadUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                });

                if (!response.ok) {
                    throw new Error(`Download failed: HTTP ${response.status}`);
                }

                const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
                downloadState.total = totalSize;
                console.log(`[FFmpeg] Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);

                const tmpPath = join(meloraDir, `ffmpeg-download-tmp${downloadUrl.endsWith('.tar.xz') ? '.tar.xz' : '.zip'}`);
                const fileStream = createWriteStream(tmpPath);
                const reader = response.body?.getReader();

                if (!reader) throw new Error('No response body');

                let downloaded = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    fileStream.write(Buffer.from(value));
                    downloaded += value.length;
                    downloadState.downloaded = downloaded;
                }

                await new Promise<void>((resolve, reject) => {
                    fileStream.end(() => resolve());
                    fileStream.on('error', reject);
                });

                console.log(`[FFmpeg] Download complete. Extracting...`);
                downloadState.stage = 'extracting';

                const ffmpegBinary = getFFmpegBinaryName();
                const outputPath = getLocalFFmpegPath();

                if (downloadUrl.endsWith('.zip')) {
                    if (platform() === 'win32') {
                        execSync(
                            `powershell -Command "` +
                            `$zip = [System.IO.Compression.ZipFile]::OpenRead('${tmpPath.replace(/'/g, "''")}'); ` +
                            `$entry = $zip.Entries | Where-Object { $_.Name -eq '${ffmpegBinary}' } | Select-Object -First 1; ` +
                            `if ($entry) { [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, '${outputPath.replace(/'/g, "''")}', $true) }; ` +
                            `$zip.Dispose()"`,
                            { timeout: 120000 }
                        );
                    } else {
                        execSync(`unzip -o "${tmpPath}" "${ffmpegBinary}" -d "${meloraDir}"`, { timeout: 60000 });
                        execSync(`chmod +x "${outputPath}"`, { timeout: 5000 });
                    }
                } else if (downloadUrl.endsWith('.tar.xz')) {
                    execSync(`tar -xJf "${tmpPath}" -C "${meloraDir}" --strip-components=1 --wildcards "*/${ffmpegBinary}"`, { timeout: 60000 });
                    execSync(`chmod +x "${outputPath}"`, { timeout: 5000 });
                }

                try { require('fs').unlinkSync(tmpPath); } catch { }

                downloadState.stage = 'verifying';
                if (!existsSync(outputPath)) {
                    throw new Error(`Extraction failed: binary not found`);
                }

                try {
                    execSync(`"${outputPath}" -version`, { timeout: 5000, stdio: 'pipe' });
                } catch {
                    throw new Error('Downloaded binary is not working');
                }

                console.log(`[FFmpeg] ✓ Installed successfully at: ${outputPath}`);
                downloadState = { active: false, downloaded: downloadState.total, total: downloadState.total, stage: 'done', error: '' };

            } catch (error: any) {
                console.error('[FFmpeg] Installation failed:', error.message);
                downloadState = { ...downloadState, active: false, stage: 'error', error: error.message };
            }
        })();

        // Return immediately to front-end
        return NextResponse.json({ success: true, started: true, message: 'Download started in background' });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=status, ?action=progress, or ?action=download' }, { status: 400 });
}
