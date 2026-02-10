/**
 * Safe localStorage wrapper with QuotaExceededError handling.
 * Provides graceful degradation when storage is full.
 */

/**
 * Safely write to localStorage. If QuotaExceededError is thrown,
 * attempt to free space by evicting low-priority cached data.
 * Returns true if write succeeded, false otherwise.
 */
export function safeSetItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
            console.warn(`[Storage] QuotaExceeded writing '${key}' (${(value.length / 1024).toFixed(1)} KB). Attempting cleanup...`);

            // Try to free space by evicting low-priority data
            const freed = evictLowPriorityData();

            if (freed) {
                // Retry once after eviction
                try {
                    localStorage.setItem(key, value);
                    console.log(`[Storage] Write succeeded after evicting ${freed} entries`);
                    return true;
                } catch {
                    console.error(`[Storage] Write still failed after eviction for '${key}'`);
                    return false;
                }
            }

            console.error(`[Storage] Nothing to evict. Write failed for '${key}'`);
            return false;
        }

        // Non-quota error — re-throw
        console.error(`[Storage] Unexpected error writing '${key}':`, e);
        return false;
    }
}

/**
 * Evict low-priority data from localStorage to free space.
 * Priority (lowest = evicted first):
 * 1. API cache (melora_api_cache)
 * 2. Old signals beyond limit
 * 3. Old stats entries
 * Returns number of entries evicted.
 */
function evictLowPriorityData(): number {
    let evicted = 0;

    // 1. Clear API cache (safe to lose — just re-fetches)
    const cacheKey = 'melora_api_cache';
    if (localStorage.getItem(cacheKey)) {
        localStorage.removeItem(cacheKey);
        evicted++;
    }

    // 2. Trim signals to half if large
    const signalKey = 'melora_signals';
    try {
        const raw = localStorage.getItem(signalKey);
        if (raw) {
            const signals = JSON.parse(raw);
            if (Array.isArray(signals) && signals.length > 200) {
                // Keep only the most recent 200
                const trimmed = signals.slice(-200);
                localStorage.setItem(signalKey, JSON.stringify(trimmed));
                evicted++;
            }
        }
    } catch { }

    // 3. Trim artist signals
    const artistSignalKey = 'melora_artist_signals';
    try {
        const raw = localStorage.getItem(artistSignalKey);
        if (raw) {
            const signals = JSON.parse(raw);
            if (Array.isArray(signals) && signals.length > 100) {
                localStorage.setItem(artistSignalKey, JSON.stringify(signals.slice(-100)));
                evicted++;
            }
        }
    } catch { }

    // 4. Trim stats — cap topSongs to top 200, topArtists to top 100
    const statsKey = 'melora-stats-v1';
    try {
        const raw = localStorage.getItem(statsKey);
        if (raw) {
            const stats = JSON.parse(raw);
            const songEntries = Object.entries(stats.topSongs || {});
            const artistEntries = Object.entries(stats.topArtists || {});

            if (songEntries.length > 200) {
                const sorted = songEntries.sort((a: any, b: any) => b[1].plays - a[1].plays).slice(0, 200);
                stats.topSongs = Object.fromEntries(sorted);
                evicted++;
            }

            if (artistEntries.length > 100) {
                const sorted = artistEntries.sort((a: any, b: any) => (b[1] as number) - (a[1] as number)).slice(0, 100);
                stats.topArtists = Object.fromEntries(sorted);
                evicted++;
            }

            if (evicted > 0) {
                localStorage.setItem(statsKey, JSON.stringify(stats));
            }
        }
    } catch { }

    // 5. Clear search history if exists
    const searchHistoryKey = 'melora-search-history';
    if (localStorage.getItem(searchHistoryKey)) {
        localStorage.removeItem(searchHistoryKey);
        evicted++;
    }

    return evicted;
}

/**
 * Get approximate localStorage usage in bytes.
 */
export function getStorageUsage(): { used: number; usedFormatted: string } {
    if (typeof window === 'undefined') return { used: 0, usedFormatted: '0 B' };

    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
            total += key.length + (localStorage.getItem(key)?.length || 0);
        }
    }

    // Each char is 2 bytes in UTF-16
    const bytes = total * 2;

    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return {
        used: bytes,
        usedFormatted: `${size.toFixed(1)} ${units[unitIndex]}`
    };
}
