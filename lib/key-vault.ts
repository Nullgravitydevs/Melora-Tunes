import { PlayableSource } from './types';

// ============================================================================
// The Key Vault (Endpoints loaded from environment variables)
// ============================================================================

interface KeyEndpoint {
    name: string;
    url: string;
    type: 'tidal' | 'qobuz';
    paramName?: string; // For Qobuz streaming param
    qualityParam?: string; // For Qobuz quality ID
    appId?: string; // For direct Qobuz fallback
}

// Load endpoints from environment variables (set in .env.local, never committed)
// IMPORTANT: Next.js requires LITERAL process.env.NEXT_PUBLIC_* references.
// Dynamic lookups like process.env[key] will NOT work — Next.js does static replacement.
function parseEndpoints(raw: string | undefined): KeyEndpoint[] {
    try {
        if (!raw || raw === '[]') return [];
        return JSON.parse(raw) as KeyEndpoint[];
    } catch (e) {
        console.error('[KeyVault] Failed to parse endpoints:', e);
        return [];
    }
}

// 🥇 Tier 1: Qobuz (Hi-Res) - Loaded from NEXT_PUBLIC_QOBUZ_ENDPOINTS
const QOBUZ_KEYS: KeyEndpoint[] = parseEndpoints(process.env.NEXT_PUBLIC_QOBUZ_ENDPOINTS);

// 🥈 Tier 2: Tidal (Lossless) - Loaded from NEXT_PUBLIC_TIDAL_ENDPOINTS
const TIDAL_KEYS: KeyEndpoint[] = parseEndpoints(process.env.NEXT_PUBLIC_TIDAL_ENDPOINTS);

// ============================================================================
// Smart Rotation Logic
// ============================================================================

interface EndpointStats {
    failures: number;
    successes: number;
    lastFailure: number;
    lastSuccess: number;
    avgLatency: number;
    isCircuitOpen: boolean;
}

const CIRCUIT_TIMEOUT = 5 * 60 * 1000; // 5 minutes ban for bad mirrors
const MAX_FAILURES = 3; // 3 strikes and you're out (temporarily)

class KeyVaultService {
    private stats: Map<string, EndpointStats> = new Map();

    constructor() {
        // Initialize stats for all loaded endpoints
        [...QOBUZ_KEYS, ...TIDAL_KEYS].forEach(k => {
            this.stats.set(k.name, {
                failures: 0,
                successes: 0,
                lastFailure: 0,
                lastSuccess: 0,
                avgLatency: 0,
                isCircuitOpen: false
            });
        });

        console.log(`[KeyVault] Loaded ${QOBUZ_KEYS.length} Qobuz + ${TIDAL_KEYS.length} Tidal endpoints.`);
    }

    /**
     * Get sorted list of healthy endpoints, fastest/most reliable first
     */
    getHealthyEndpoints(type: 'tidal' | 'qobuz'): KeyEndpoint[] {
        const pool = type === 'tidal' ? TIDAL_KEYS : QOBUZ_KEYS;
        const now = Date.now();

        return pool.filter(k => {
            if (k.name === 'backup_app_id') return false; // Exclude non-stream keys from generic pool
            const stat = this.stats.get(k.name)!;

            // Check Circuit Breaker
            if (stat.isCircuitOpen) {
                if (now - stat.lastFailure > CIRCUIT_TIMEOUT) {
                    // Reset probation
                    stat.isCircuitOpen = false;
                    stat.failures = 0;
                    return true;
                }
                return false;
            }
            return true;
        }).sort((a, b) => {
            const statA = this.stats.get(a.name)!;
            const statB = this.stats.get(b.name)!;

            // Priority 1: Recent Success (Sticky) - BUT ONLY IF NO FAILURES
            const aRecent = (now - statA.lastSuccess) < 60000 && statA.failures === 0;
            const bRecent = (now - statB.lastSuccess) < 60000 && statB.failures === 0;
            if (aRecent && !bRecent) return -1;
            if (!aRecent && bRecent) return 1;

            // Priority 2: Failure Count (Lower is better)
            if (statA.failures !== statB.failures) return statA.failures - statB.failures;

            // Priority 3: Latency (Lower is better, if we have data)
            if (statA.avgLatency > 0 && statB.avgLatency > 0) return statA.avgLatency - statB.avgLatency;

            return 0;
        });
    }

    reportSuccess(name: string, latencyMs: number) {
        const stat = this.stats.get(name);
        if (!stat) return;

        stat.successes++;
        stat.lastSuccess = Date.now();
        stat.failures = 0; // Reset failures on success
        stat.isCircuitOpen = false;

        // Rolling average latency
        if (stat.avgLatency === 0) stat.avgLatency = latencyMs;
        else stat.avgLatency = (stat.avgLatency * 0.7) + (latencyMs * 0.3);

        console.log(`[KeyVault] ${name} success (${Math.round(latencyMs)}ms). Score improved.`);
    }

    reportFailure(name: string) {
        const stat = this.stats.get(name);
        if (!stat) return;

        stat.failures++;
        stat.lastFailure = Date.now();
        console.warn(`[KeyVault] ${name} failed (${stat.failures}/${MAX_FAILURES}).`);

        if (stat.failures >= MAX_FAILURES) {
            stat.isCircuitOpen = true;
            console.error(`[KeyVault] 🚫 CIRCUIT OPEN: ${name} banned for 5 mins.`);
        }
    }

    getQobuzMetadataKey() {
        return QOBUZ_KEYS.find(k => k.name === 'backup_app_id');
    }
}

export const KeyVault = new KeyVaultService();
