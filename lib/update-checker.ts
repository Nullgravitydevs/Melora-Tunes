/**
 * GitHub Release Update Checker
 * Polls the latest release from GitHub and compares with current app version.
 * No auth needed — public repo, unauthenticated GET is fine.
 */

const GITHUB_REPO = 'Nullgravitydevs/Melora-Tunes';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const STORAGE_KEY = 'melora-update-check';
const DISMISSED_KEY = 'melora-update-dismissed';

export const APP_VERSION = '1.0.0-beta.1';

interface UpdateInfo {
    version: string;
    name: string;
    body: string;
    url: string;
    publishedAt: string;
}

function compareVersions(current: string, latest: string): number {
    // Strip leading 'v' and any prerelease suffix for comparison
    const clean = (v: string) => v.replace(/^v/, '').replace(/-.+$/, '');
    const a = clean(current).split('.').map(Number);
    const b = clean(latest).split('.').map(Number);

    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (b[i] || 0) - (a[i] || 0);
        if (diff !== 0) return diff;
    }

    // If base versions are equal, a prerelease is always older than a full release
    const aHasPrerelease = current.includes('-');
    const bHasPrerelease = latest.replace(/^v/, '').includes('-');
    if (aHasPrerelease && !bHasPrerelease) return 1; // latest is newer
    if (!aHasPrerelease && bHasPrerelease) return -1; // current is newer

    return 0;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
    if (typeof window === 'undefined') return null;

    // Throttle: don't check more than once per CHECK_INTERVAL
    try {
        const lastCheck = localStorage.getItem(STORAGE_KEY);
        if (lastCheck) {
            const { timestamp } = JSON.parse(lastCheck);
            if (Date.now() - timestamp < CHECK_INTERVAL) {
                // Return cached result if available
                const cached = JSON.parse(lastCheck);
                if (cached.update) return cached.update;
                return null;
            }
        }
    } catch { /* ignore */ }

    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
            {
                headers: { 'Accept': 'application/vnd.github+json' },
                cache: 'no-store',
            }
        );

        if (!res.ok) {
            // No releases yet or rate limited — cache the miss
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), update: null }));
            return null;
        }

        const data = await res.json();
        const latestVersion = data.tag_name || '';

        if (compareVersions(APP_VERSION, latestVersion) > 0) {
            // Newer version available
            const update: UpdateInfo = {
                version: latestVersion,
                name: data.name || latestVersion,
                body: data.body || '',
                url: data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`,
                publishedAt: data.published_at || '',
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), update }));
            return update;
        }

        // Current version is up to date
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: Date.now(), update: null }));
        return null;
    } catch (e) {
        console.warn('[UpdateChecker] Failed to check for updates:', e);
        return null;
    }
}

export function isUpdateDismissed(version: string): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === version;
    } catch {
        return false;
    }
}

export function dismissUpdate(version: string): void {
    try {
        localStorage.setItem(DISMISSED_KEY, version);
    } catch { /* ignore */ }
}
