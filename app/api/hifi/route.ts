import { NextRequest, NextResponse } from 'next/server';
import { searchHiFi } from '@/lib/hifi';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const query = sanitizeParam(searchParams.get('q'), 200);

    if (!type) return NextResponse.json({ success: false, error: 'Missing type' }, { status: 400 });

    try {
        if (type === 'search') {
            if (!query) {
                return NextResponse.json({ success: false, error: 'Missing search query' }, { status: 400 });
            }

            // Clean HTML entities from query (JSX rendering can encode quotes as &quot;)
            const cleanQuery = query
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&#39;/g, "'");

            console.log(`[API/HiFi] Search: "${cleanQuery}"`);

            const results = await searchHiFi(cleanQuery);

            if (!results) {
                console.warn(`[API/HiFi] No results for: "${cleanQuery}"`);
                return NextResponse.json({ success: false, error: 'No results' }, { status: 404 });
            }

            const response = NextResponse.json({
                success: true,
                source: results.source,
                tracks: results.tracks,
                albums: results.albums
            });
            response.headers.set('Cache-Control', 'public, max-age=120, s-maxage=300');
            return addSecurityHeaders(response);
        }

        // Note: Streams are handled CLIENT-SIDE by hifi-client.ts calling hifi.ts directly.
        // This API is primarily for Search Proxying to avoid CORS on search endpoints if needed,
        // or just to centralize logic.

        return NextResponse.json({ success: false, error: 'Not implemented or Invalid Parameters' });

    } catch (error: any) {
        console.error("HiFi API Error:", error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Error' }, { status: 500 });
    }
}
