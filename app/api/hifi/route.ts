import { NextRequest, NextResponse } from 'next/server';
import { searchHiFi } from '@/lib/hifi';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const query = searchParams.get('q');

    if (!type) return NextResponse.json({ success: false, error: 'Missing type' }, { status: 400 });

    try {
        if (type === 'search' && query) {
            console.log(`[API/HiFi] God Mode Search: ${query}`);

            // Execute Parallel Search (Client Logic running on Server)
            const results = await searchHiFi(query);

            if (!results) {
                return NextResponse.json({ success: false, error: 'No results' });
            }

            return NextResponse.json({
                success: true,
                source: results.source,
                tracks: results.tracks,
                albums: results.albums
            });
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
