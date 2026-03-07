import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const playlistUrl = searchParams.get('url');

    if (!playlistUrl || !playlistUrl.includes('music.apple.com')) {
        return NextResponse.json({ error: 'Valid Apple Music playlist URL is required' }, { status: 400 });
    }

    try {
        console.log(`[Playlist Scraper] Fetching: ${playlistUrl}`);
        const response = await fetch(playlistUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: `Failed to fetch playlist page: ${response.status}` }, { status: 502 });
        }

        const html = await response.text();

        // Strategy: Look for the serialized data script tag which contains the full track list JSON
        // Using RegExp object to avoid TS parser issues with script tags inside regex literals
        const scriptMatch = html.match(new RegExp('<script id="serialized-server-data" type="application/json">([\\\\s\\\\S]*?)</script>'));

        if (!scriptMatch) {
            // Fallback: Try to find any large JSON blob that looks like track data
            const anyJsonMatch = html.match(new RegExp('\\[\\{"id":"pl\\..*?\\}\\]'));
            if (!anyJsonMatch) {
                return NextResponse.json({ error: 'Could not find playlist data on page. It might be private or region-locked.' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Playlist data script not found' }, { status: 404 });
        }

        const data = JSON.parse(scriptMatch[1]);

        const tracks: any[] = [];

        const findTracks = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            // Check if this object is a track
            if (obj.type === 'song' || obj.type === 'library-song' || (obj.attributes && obj.attributes.name && obj.attributes.artistName)) {
                tracks.push({
                    trackId: obj.id,
                    trackName: obj.attributes?.name,
                    artistName: obj.attributes?.artistName,
                    collectionName: obj.attributes?.albumName,
                    artworkUrl100: obj.attributes?.artwork?.url?.replace('{w}', '100').replace('{h}', '100').replace('{f}', 'jpg'),
                    trackTimeMillis: obj.attributes?.durationInMillis || 0,
                });
                return; // Don't go deeper into track objects
            }

            for (const key in obj) {
                findTracks(obj[key]);
            }
        };

        findTracks(data);

        if (tracks.length === 0) {
            return NextResponse.json({ error: 'No tracks found in playlist data.' }, { status: 404 });
        }

        // De-duplicate by trackId or name+artist
        const uniqueTracks = Array.from(new Map(tracks.map(t => [t.trackId || `${t.trackName}-${t.artistName}`, t])).values());

        return NextResponse.json({
            name: playlistUrl.split('/').pop()?.split('?')[0] || 'Imported Playlist',
            tracks: uniqueTracks
        });

    } catch (error: any) {
        console.error('[Playlist Scraper] Error:', error);
        return NextResponse.json({ error: `Failed to parse playlist: ${error.message}` }, { status: 500 });
    }
}
