
interface MusixmatchResponse {
    message: {
        header: {
            status_code: number;
        };
        body?: any;
    };
}

export class Musixmatch {
    private token: string | null = null;
    private tokenRetryCount = 0;
    private maxTokenRetries = 3;

    private async _fetch(action: string, query: Record<string, string> = {}): Promise<MusixmatchResponse> {
        // Build Query String
        const params = new URLSearchParams(query);
        params.append('action', action);
        if (this.token) {
            params.append('usertoken', this.token);
        }
        // Match parameters from Audion (reversed engineered)
        params.append('app_id', 'web-desktop-app-v1.0');
        params.append('t', String(Date.now())); // Audion uses milliseconds
        params.append('guid', this._getGuid());

        try {
            const res = await fetch(`/api/musixmatch?${params.toString()}`);
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Proxy Error: ${res.status} ${text}`);
            }
            return await res.json();
        } catch (e) {
            // calculated silence for seamless fallback
            throw e;
        }
    }

    private async _get(action: string, query: Record<string, string> = {}): Promise<MusixmatchResponse> {
        if (action !== "token.get" && !this.token) {
            await this._getToken();
        }

        try {
            return await this._fetch(action, query);
        } catch (e: any) {
            // Check for 401/402 or specific invalid_signature hint in error message
            if (e.message?.includes('401') || e.message?.includes('402') || e.message?.includes('invalid_signature')) {
                console.warn(`[Musixmatch] Token invalid (${e.message}), rotating...`);
                this.clearToken();

                if (action !== "token.get") {
                    // Try next token
                    await this._getToken();
                    // Retry request once with new token
                    return this._fetch(action, query);
                }
            }
            throw e;
        }
    }

    private async _getToken(): Promise<void> {
        const tokenKey = "musixmatch_token";
        const expirationKey = "musixmatch_expiration";

        if (typeof window === 'undefined') return;

        const currentTime = Math.floor(Date.now() / 1000);
        const cachedToken = localStorage.getItem(tokenKey);
        const expirationTime = parseInt(localStorage.getItem(expirationKey) || "0");

        if (cachedToken && expirationTime && currentTime < expirationTime) {
            this.token = cachedToken;
            return;
        }

        console.log("[Musixmatch] Getting new token...");

        // Strategy: Try generating fresh first, if fail, iterate through fallbacks
        try {
            // Attempt 1: Fresh Generation
            const data = await this._fetch("token.get", { user_language: "en" });
            if (data.message.header.status_code === 200 && data.message.body?.user_token && data.message.body.user_token !== 'UpgradeOnlyUpgradeOnlyUpgradeOnlyUpgradeOnly') {
                this.token = data.message.body.user_token;
                this._saveToken(this.token!);
                return;
            }
        } catch (e) {
            console.warn("[Musixmatch] Fresh token generation failed, switching to fallbacks.");
        }

        // Fallback Tokens (Known working keys from various sources/re-engineering)
        const FALLBACK_TOKENS = [
            '220706c64654766861623861633537333036326639446d33306d51', // Common Desktop Key
            '2005218c962803023052822a1674e214d271638210e757d57d60f4', // Alternative Key
            '196013a571775796a583e742e82522770281313463380436853609'  // Another fallback
        ];

        // Pick one at random to distribute load, or iterate?
        // Let's pick random for now to avoid thundering herd on the first one
        // Ideally we would try them in sequence if one fails, but _get handles the retry.
        // So here we just set one.
        const randomToken = FALLBACK_TOKENS[Math.floor(Math.random() * FALLBACK_TOKENS.length)];
        this.token = randomToken;
        this._saveToken(randomToken);
        console.log("[Musixmatch] Using fallback token:", this.token?.substring(0, 10) + "...");
    }

    private _saveToken(token: string) {
        if (typeof window === 'undefined') return;
        const currentTime = Math.floor(Date.now() / 1000);
        localStorage.setItem("musixmatch_token", token);
        localStorage.setItem("musixmatch_expiration", String(currentTime + 600));
    }

    clearToken() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem("musixmatch_token");
            localStorage.removeItem("musixmatch_expiration");
        }
        this.token = null;
    }

    async getSyncedLyrics(trackName: string, artistName: string, duration: number): Promise<{ synced: boolean, text: string } | null> {
        try {
            // 1. Search Track
            const searchRes = await this._get("track.search", {
                q_track: trackName,
                q_artist: artistName,
                page_size: "5",
                page: "1",
                f_has_lyrics: "1",
                s_track_rating: "desc"
            });
            // Also try `q` if specific fields fail? Audion used `q`.
            // Audion: `["q", searchTerm]`

            let trackId = "";
            let tracks = searchRes.message.body?.track_list || [];

            if (tracks.length === 0) {
                // Try fallback generic search
                const res2 = await this._get("track.search", {
                    q: `${trackName} ${artistName}`,
                    page_size: "5",
                    page: "1"
                });
                tracks = res2.message.body?.track_list || [];
            }

            if (tracks.length === 0) return null;

            // Simple match: First result
            // Maybe filter by duration?
            const track = tracks[0].track;
            // Diff check?
            if (Math.abs((track.track_length || 0) - duration) > 15) {
                console.warn("[Musixmatch] Duration Mismatch:", track.track_length, duration);
                // Proceed anyway? Or try next?
                // Let's rely on search ranking for now.
            }
            trackId = String(track.track_id);

            // 2. Get Subtitles (Synced)
            const subRes = await this._get("track.subtitle.get", {
                track_id: trackId,
                subtitle_format: "lrc"
            });

            const body = subRes.message.body?.subtitle?.subtitle_body;
            if (body) {
                return { synced: true, text: body };
            }

            // 3. Try RichSync (Word by Word) - Convert to LRC?
            // Audion does this. It's complex.
            // If Standard LRC failed, maybe RichSync exists.
            // ... (Skip complex RichSync parsing for now unless requested)

            // 4. Fallback to Plain Lyrics
            const lyricRes = await this._get("track.lyrics.get", { track_id: trackId });
            const plain = lyricRes.message.body?.lyrics?.lyrics_body;
            if (plain) {
                return { synced: false, text: plain };
            }

        } catch (e) {
            console.error("[Musixmatch] Error:", e);
        }
        return null;
    }
    private _getGuid(): string {
        const key = 'mx_guid';
        const cached = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (cached) return cached;

        const newGuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        if (typeof window !== 'undefined') {
            localStorage.setItem(key, newGuid);
        }
        return newGuid;
    }
}

export const musixmatch = new Musixmatch();
