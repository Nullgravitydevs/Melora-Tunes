import { NextResponse } from 'next/server';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

export async function GET(request: Request) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const id = sanitizeParam(searchParams.get('id'), 100);

    if (!id) {
        return NextResponse.json({ error: 'Song ID required' }, { status: 400 });
    }

    const apiUrl = `https://www.jiosaavn.com/api.php?__call=lyrics.getLyrics&_format=json&ctx=wap6dot0&api_version=4&lyrics_id=${id}`;
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
            if (res.status === 404) {
                return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
            }
            throw new Error(`JioSaavn API Error: ${res.status}`);
        }

        const data = await res.json();
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Lyrics API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch lyrics' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
