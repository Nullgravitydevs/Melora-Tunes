/**
 * Discord Rich Presence Integration
 * Shows "Listening to [Song]" on Discord
 * Only works in Electron mode (desktop app)
 */

interface DiscordActivity {
    details: string;      // Song title
    state: string;        // Artist name
    largeImageKey?: string;  // Album art URL
    largeImageText?: string; // Album name
    smallImageKey?: string;  // App icon
    smallImageText?: string; // "Melora"
    startTimestamp?: number;
    endTimestamp?: number;
}

// Discord application ID (you'll need to create one at discord.com/developers)
const DISCORD_CLIENT_ID = '1234567890123456789'; // Replace with real ID

let rpcClient: any = null;
let isConnected = false;
let reconnectTimeout: NodeJS.Timeout | null = null;

/**
 * Check if we're running in Electron
 */
export function isElectronApp(): boolean {
    return typeof window !== 'undefined' &&
        typeof (window as any).process !== 'undefined' &&
        (window as any).process.type === 'renderer';
}

/**
 * Initialize Discord RPC connection
 * Call this once when the app starts (Electron only)
 */
export async function initDiscordRPC(): Promise<boolean> {
    if (!isElectronApp()) {
        console.log('[Discord] Not in Electron, skipping RPC');
        return false;
    }

    try {
        // Dynamic import to avoid bundling in web builds
        // @ts-expect-error - discord-rpc only available in Electron builds
        const { Client } = await import('discord-rpc');

        rpcClient = new Client({ transport: 'ipc' });

        rpcClient.on('ready', () => {
            console.log('[Discord] ✓ RPC Connected');
            isConnected = true;
        });

        rpcClient.on('disconnected', () => {
            console.log('[Discord] RPC Disconnected');
            isConnected = false;
            scheduleReconnect();
        });

        await rpcClient.login({ clientId: DISCORD_CLIENT_ID });
        return true;
    } catch (error) {
        console.warn('[Discord] RPC initialization failed:', error);
        scheduleReconnect();
        return false;
    }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect() {
    if (reconnectTimeout) return;

    reconnectTimeout = setTimeout(async () => {
        reconnectTimeout = null;
        await initDiscordRPC();
    }, 15000); // Retry every 15 seconds
}

/**
 * Update Discord presence with current song
 */
export async function updateDiscordPresence(song: {
    name: string;
    artist: string;
    album?: string;
    albumArt?: string;
    duration?: number;
    elapsed?: number;
}): Promise<void> {
    if (!isConnected || !rpcClient) return;

    try {
        const activity: DiscordActivity = {
            details: song.name.slice(0, 128), // Discord limits to 128 chars
            state: `by ${song.artist}`.slice(0, 128),
            largeImageKey: song.albumArt || 'melora_icon',
            largeImageText: song.album || 'Playing on Melora',
            smallImageKey: 'melora_icon',
            smallImageText: 'Melora',
        };

        // Add timestamps if available
        if (song.duration && song.elapsed !== undefined) {
            const now = Date.now();
            activity.startTimestamp = now - (song.elapsed * 1000);
            activity.endTimestamp = now + ((song.duration - song.elapsed) * 1000);
        }

        await rpcClient.setActivity(activity);
        console.log('[Discord] Presence updated:', song.name);
    } catch (error) {
        console.warn('[Discord] Failed to update presence:', error);
    }
}

/**
 * Clear Discord presence (when playback stops)
 */
export async function clearDiscordPresence(): Promise<void> {
    if (!isConnected || !rpcClient) return;

    try {
        await rpcClient.clearActivity();
        console.log('[Discord] Presence cleared');
    } catch (error) {
        console.warn('[Discord] Failed to clear presence:', error);
    }
}

/**
 * Disconnect from Discord RPC
 */
export function disconnectDiscordRPC(): void {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (rpcClient) {
        rpcClient.destroy();
        rpcClient = null;
        isConnected = false;
        console.log('[Discord] RPC Disconnected');
    }
}
