/**
 * Melora-Tunes Cleanup Utility
 * Handles core reset logic for the application.
 */

const DATABASES = ['melora-db', 'MeloraOfflineDB'];

/**
 * Completely purges all user data:
 * 1. Clears localStorage (Settings, Playlists, Signals)
 * 2. Deletes IndexedDB databases (History, Offline Storage)
 * 3. Reloads the application
 */
export async function factoryReset() {
    console.log("[FactoryReset] Initiating complete purge...");

    // 1. Clear LocalStorage
    if (typeof window !== 'undefined') {
        localStorage.clear();
        console.log("[FactoryReset] LocalStorage cleared.");
    }

    // 2. Delete IndexedDB Databases
    if (typeof indexedDB !== 'undefined') {
        for (const dbName of DATABASES) {
            try {
                const req = indexedDB.deleteDatabase(dbName);
                req.onsuccess = () => console.log(`[FactoryReset] Database deleted: ${dbName}`);
                req.onerror = () => console.error(`[FactoryReset] Failed to delete database: ${dbName}`);
                req.onblocked = () => {
                    console.warn(`[FactoryReset] Database deletion blocked: ${dbName}. Closing version...`);
                };
            } catch (err) {
                console.error(`[FactoryReset] Error deleting ${dbName}:`, err);
            }
        }
    }

    // 3. Optional: Clear session storage
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
    }

    // 4. Force Reload
    console.log("[FactoryReset] Purge complete. Reloading...");

    // Brief delay to ensure IDB delete requests are sent
    setTimeout(() => {
        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    }, 500);
}
