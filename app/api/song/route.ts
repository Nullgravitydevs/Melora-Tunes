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

    // Validate ID format (alphanumeric, hyphens, underscores, commas)
    if (!/^[a-zA-Z0-9_,\-]+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid song ID format' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_JIOSAAVN_API_URL || "https://www.jiosaavn.com/api.php?__call=";
    const apiUrl = `${baseUrl}song.getDetails&_format=json&pids=${id}&ctx=wap6dot0`;
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
        response.headers.set('Cache-Control', 'public, max-age=600, s-maxage=1200');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Song Details API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch song details' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
