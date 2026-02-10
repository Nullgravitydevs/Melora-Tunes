import { NextResponse } from 'next/server';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

export async function GET(request: Request) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const track = sanitizeParam(searchParams.get('track'), 200);
    const artist = sanitizeParam(searchParams.get('artist'), 200);
    const album = sanitizeParam(searchParams.get('album'), 200);
    const duration = searchParams.get('duration');

    if (!track || !artist) {
        return NextResponse.json({ error: 'Track and Artist required' }, { status: 400 });
    }

    // LRCLib API — include optional album and duration for better matching
    let apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;
    if (album) apiUrl += `&album_name=${encodeURIComponent(album)}`;
    if (duration && /^\d+$/.test(duration)) apiUrl += `&duration=${duration}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
        const res = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'MeloraTunes/1.0'
            }
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
            }
            throw new Error(`LRCLib API Error: ${res.status}`);
        }

        const data = await res.json();
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Lyrics Fallback API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fallback lyrics' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
