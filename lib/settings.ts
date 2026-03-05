export interface AppSettings {
    volume: number;
    clickSounds: boolean;
    theme: 'classic' | 'black' | 'silver' | 'dark' | 'blue' | 'rosegold' | 'blush';
    qualityPreference: 'hires' | 'flac' | '320' | '160' | '96' | '48' | '12';
    // Legacy mapping support could be done in loadSettings if needed, but for now we'll just add the new field.
    lastPlayedSongId: string | null;
    version: string;
    userName?: string;
    userDOB?: string;
    languages?: string[];
    stopAtEndOfSong?: boolean;
    notificationsEnabled?: boolean;
    crossfadeDuration?: number;
    playbackSpeed?: number;
    downloadDirectory?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    volume: 0.7,
    clickSounds: true,
    theme: 'classic', // White/Classic iPod
    qualityPreference: '320', // Default to High Quality
    lastPlayedSongId: null,
    version: '1.0.0-beta.1',
    languages: ['english', 'hindi'],
    stopAtEndOfSong: false,
    notificationsEnabled: true,
    crossfadeDuration: 0,
    playbackSpeed: 1
};

const STORAGE_KEY = 'melora-settings';

let cachedSettings: AppSettings | null = null;
let lastStoredString: string | null = null;

export function loadSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_SETTINGS;

        if (cachedSettings && stored === lastStoredString) {
            return cachedSettings;
        }

        const parsed = JSON.parse(stored);
        cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
        lastStoredString = stored;

        return cachedSettings as AppSettings;
    } catch (error) {
        console.error('Failed to load settings:', error);
        return DEFAULT_SETTINGS;
    }
}

export function saveSettings(settings: Partial<AppSettings>): void {
    if (typeof window === 'undefined') return;

    try {
        const current = loadSettings();
        const updated = { ...current, ...settings };
        const serialized = JSON.stringify(updated);

        localStorage.setItem(STORAGE_KEY, serialized);

        // Update Cache
        cachedSettings = updated;
        lastStoredString = serialized;

        // Dispatch custom event for cross-component reactivity
        console.log('[Settings] 📤 Dispatching melora-settings-changed event with:', updated);
        window.dispatchEvent(new CustomEvent('melora-settings-changed', { detail: updated }));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

export function resetSettings(): void {
    if (typeof window === 'undefined') return;

    try {
        const serialized = JSON.stringify(DEFAULT_SETTINGS);
        localStorage.setItem(STORAGE_KEY, serialized);

        cachedSettings = DEFAULT_SETTINGS;
        lastStoredString = serialized;
    } catch (error) {
        console.error('Failed to reset settings:', error);
    }
}

export function clearCache(): void {
    if (typeof window === 'undefined') return;

    try {
        // Clear cache data but preserve user data (liked songs, playlists, recently played, settings)
        const preserveKeys = [
            STORAGE_KEY,
            'melora-liked-songs',
            'melora-recently-played',
            'melora-mixes',
            'melora-playlists',
            'melora-saved-albums',
            'melora-saved-artists',
            'melora-search-history',
        ];
        const preserved = new Map<string, string>();
        preserveKeys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) preserved.set(key, val);
        });
        localStorage.clear();
        preserved.forEach((val, key) => localStorage.setItem(key, val));
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}
