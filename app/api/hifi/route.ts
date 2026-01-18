import { NextRequest, NextResponse } from 'next/server';
import { searchHiFi, getHiFiStreamUrl, searchTidal, searchQobuz, getTidalStreamUrl, getQobuzStreamUrl, getQobuzAlbum, getTidalAlbum } from '@/lib/hifi';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'search';
    const query = searchParams.get('q');
    const trackId = searchParams.get('id');
    const source = (searchParams.get('source') || 'tidal') as 'tidal' | 'qobuz';

    try {
        // Search
        if (type === 'search' && query) {
            let result;

            if (source === 'qobuz') {
                result = await searchQobuz(query);
            } else if (source === 'tidal') {
                result = await searchTidal(query);
            } else {
                // Default: try both, Qobuz first
                result = await searchHiFi(query);
            }

            if (!result) {
                return NextResponse.json({ error: 'No results found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, ...result });
        }

        // Stream URL
        if (type === 'stream' && trackId) {
            let result;

            if (source === 'qobuz') {
                result = await getQobuzStreamUrl(trackId);
            } else {
                result = await getTidalStreamUrl(trackId);
            }

            if (!result) {
                return NextResponse.json({ error: 'Stream not available' }, { status: 404 });
            }

            return NextResponse.json({
                success: true,
                url: result.url,
                quality: result.quality,
                source
            });
        }

        // Album Details
        if (type === 'album' && trackId) {
            let tracks: any[] = [];

            if (source === 'qobuz') {
                tracks = await getQobuzAlbum(trackId);
            } else {
                tracks = await getTidalAlbum(trackId);
            }

            if (!tracks || tracks.length === 0) {
                return NextResponse.json({ error: 'Album empty or not found' }, { status: 404 });
            }

            return NextResponse.json({ success: true, tracks, source });
        }

        return NextResponse.json({ error: 'Invalid request. Use ?type=search&q=query or ?type=stream&id=trackId' }, { status: 400 });

    } catch (error: any) {
        console.error('[HiFi API] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
