import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, addSecurityHeaders } from '@/lib/api-middleware';

/**
 * Allowlist of permitted Musixmatch API actions.
 */
const ALLOWED_ACTIONS = new Set([
    'token.get',
    'track.search',
    'track.lyrics.get',
    'track.subtitle.get',
    'track.richsync.get',
    'matcher.lyrics.get',
    'matcher.track.get',
    'matcher.subtitle.get',
]);

export async function GET(request: NextRequest) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Validate action against allowlist
    if (!action || !ALLOWED_ACTIONS.has(action)) {
        return NextResponse.json(
            { error: `Action '${action?.slice(0, 50)}' is not permitted` },
            { status: 403 }
        );
    }

    // Robustly remove 'action' from params
    const forwardParams = new URLSearchParams(searchParams.toString());
    forwardParams.delete('action');
    const query = forwardParams.toString();

    // Failover Strategy: Primary -> Backup
    const endpoints = [
        `https://apic-desktop.musixmatch.com/ws/1.1/${action}?${query}`,
        `https://www.musixmatch.com/ws/1.1/${action}?${query}` // Backup
    ];

    let lastError = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        for (const apiUrl of endpoints) {
            try {
                const res = await fetch(apiUrl, {
                    signal: controller.signal,
                    headers: {
                        'Origin': 'https://www.musixmatch.com',
                        'Referer': 'https://www.musixmatch.com/',
                        // Do NOT forward client cookies to third parties
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                });

                if (res.status === 404 || res.status === 403) {
                    lastError = new Error(`Upstream ${res.status}`);
                    continue;
                }

                let data;
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    if (!res.ok) throw new Error(text);
                    try {
                        data = JSON.parse(text);
                    } catch {
                        lastError = new Error(`Invalid JSON: ${text.substring(0, 100)}...`);
                        continue;
                    }
                }

                const response = NextResponse.json(data, { status: res.status });

                // Forward Set-Cookie from musixmatch (for token)
                const setCookies = res.headers.getSetCookie?.() || [];
                setCookies.forEach(cookie => {
                    response.headers.append('Set-Cookie', cookie);
                });

                return addSecurityHeaders(response);

            } catch (e: any) {
                if (e.name === 'AbortError') throw e;
                lastError = e;
            }
        }

        return NextResponse.json({
            error: 'All upstreams failed',
            details: lastError?.message
        }, { status: 502 });

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        return NextResponse.json({
            error: 'All upstreams failed',
            details: error?.message
        }, { status: 502 });
    } finally {
        clearTimeout(timeout);
    }
}
