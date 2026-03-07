import { NextResponse } from 'next/server';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

/**
 * Allowlist of permitted JioSaavn API calls.
 * Prevents this proxy from being used as an open relay for arbitrary API methods.
 */
const ALLOWED_CALLS = new Set([
    'search.getResults',
    'search.getAlbumResults',
    'search.getArtistResults',
    'search.getPlaylistResults',
    'song.getDetails',
    'lyrics.getLyrics',
    'content.getHomepageData',
    'webapi.getLaunchData',
    'reco.getStations',
    'reco.getstations',
    'webradio.createEntityStation',
    'webradio.getSong',
    'content.getAlbumDetails',
    'playlist.getDetails',
    'content.getArtistPageData',
    'search.getTopSearches',
    'artist.getDetails', // FIX: Allow Artist View to fetch details
]);

export async function GET(request: Request) {
    // Rate limit check
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    if (!queryString) {
        return NextResponse.json({ error: 'Parameters required' }, { status: 400 });
    }

    // Validate __call parameter against allowlist
    const apiCall = searchParams.get('__call');
    if (!apiCall || !ALLOWED_CALLS.has(apiCall)) {
        return NextResponse.json(
            { error: `API call '${sanitizeParam(apiCall, 50)}' is not permitted` },
            { status: 403 }
        );
    }

    // Forward to JioSaavn with timeout
    const baseUrl = process.env.NEXT_PUBLIC_JIOSAAVN_API_URL || "https://www.jiosaavn.com/api.php?__call=";
    const cleanBaseUrl = baseUrl.replace('?__call=', '');
    const apiUrl = `${cleanBaseUrl}?${queryString}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`JioSaavn API Error: ${res.status}`);
        }

        const data = await res.json();
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Proxy API Error:', error);
        return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
