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
}

const DEFAULT_SETTINGS: AppSettings = {
    volume: 0.7,
    clickSounds: true,
    theme: 'classic', // White/Classic iPod
    qualityPreference: '320', // Default to High Quality
    lastPlayedSongId: null,
    version: '2.0.0',
    languages: ['english', 'hindi'],
    stopAtEndOfSong: false,
    notificationsEnabled: true
};

const STORAGE_KEY = 'melora-settings';

export function loadSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return DEFAULT_SETTINGS;

        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
        console.error('Failed to reset settings:', error);
    }
}

export function clearCache(): void {
    if (typeof window === 'undefined') return;

    try {
        // Clear all localStorage except settings
        const settings = localStorage.getItem(STORAGE_KEY);
        localStorage.clear();
        if (settings) {
            localStorage.setItem(STORAGE_KEY, settings);
        }
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}
