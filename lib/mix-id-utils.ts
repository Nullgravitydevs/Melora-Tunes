interface MixLike {
    id: string;
}

const SYSTEM_MIX_IDS = new Set([
    'discovery-mix',
    'search-results',
    'quick-play',
    'otg-tape',
    'queue-mix',
    'now-playing-queue'
]);

const SYSTEM_MIX_PREFIXES = [
    'quick-',
    'search-',
    'album-',
    'artist-',
    'now-playing-',
    'jiosaavn-playlist-',
    'section-',
    'library-'
];

export function isSystemMixId(mixId: string): boolean {
    return SYSTEM_MIX_IDS.has(mixId) || SYSTEM_MIX_PREFIXES.some(prefix => mixId.startsWith(prefix));
}

export function isUserPlaylistId(mixId: string): boolean {
    return !isSystemMixId(mixId);
}

export function isUserPlaylistMix(mix: MixLike): boolean {
    return isUserPlaylistId(mix.id);
}
