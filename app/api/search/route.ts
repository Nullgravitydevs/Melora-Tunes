import { NextResponse } from 'next/server';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

export async function GET(request: Request) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const query = sanitizeParam(searchParams.get('query'), 200);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';

    if (!query) {
        return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Validate numeric params
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);
    const safePage = Math.max(parseInt(page) || 1, 1);

    const baseUrl = process.env.NEXT_PUBLIC_JIOSAAVN_API_URL || "https://www.jiosaavn.com/api.php?__call=";
    const apiUrl = `${baseUrl}search.getResults&_format=json&n=${safeLimit}&p=${safePage}&q=${encodeURIComponent(query)}&ctx=wap6dot0`;
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
        response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=120');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
