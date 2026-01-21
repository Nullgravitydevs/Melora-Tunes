import { NextRequest, NextResponse } from 'next/server';

// 🕵️ MIDDLEMAN ENDPOINTS (From SpotiFLAC Analysis)
const TIDAL_BASE = 'https://tidal.kinoplus.online';
const QOBUZ_BASE = 'https://dab.yeet.su';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const source = searchParams.get('source') || 'tidal'; // functional default
    const query = searchParams.get('q');
    const id = searchParams.get('id');

    if (!type) {
        return NextResponse.json({ success: false, error: 'Missing type parameter' }, { status: 400 });
    }

    try {
        let result = null;

        // --- 1. SEARCH HANDLER ---
        if (type === 'search' && query) {
            if (source === 'tidal') {
                // Tidal Search (Reverse Engineered)
                const target = `${TIDAL_BASE}/api/search?q=${encodeURIComponent(query)}`;
                const res = await fetch(target, { headers: { 'User-Agent': 'Melora/1.0' } });
                const data = await res.json();

                // transform to common format
                result = {
                    tracks: data.tracks?.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        artist: t.artist?.name,
                        artistId: t.artist?.id,
                        album: t.album?.title,
                        albumId: t.album?.id,
                        duration: t.duration,
                        coverArt: t.album?.cover,
                        quality: 'HI_RES_LOSSLESS', // Assuming proxy returns high
                        source: 'tidal'
                    })) || [],
                    albums: [], // TODO: map albums if needed
                    source: 'tidal'
                };

            } else {
                // Qobuz Search
                const target = `${QOBUZ_BASE}/api/search?q=${encodeURIComponent(query)}`;
                const res = await fetch(target, { headers: { 'User-Agent': 'Melora/1.0' } });
                const data = await res.json();

                result = {
                    tracks: data.tracks?.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        artist: t.performer?.name,
                        artistId: t.performer?.id,
                        album: t.album?.title,
                        albumId: t.album?.id,
                        duration: t.duration,
                        coverArt: t.album?.image?.large,
                        quality: 'LOSSLESS',
                        source: 'qobuz'
                    })) || [],
                    albums: [],
                    source: 'qobuz'
                };
            }
        }

        // --- 2. STREAM HANDLER ---
        else if (type === 'stream' && id) {
            if (source === 'tidal') {
                const target = `${TIDAL_BASE}/api/track/stream?id=${id}`;
                const res = await fetch(target);
                const data = await res.json();

                // Middleman usually returns { url: "...", quality: "..." }
                if (data.url) {
                    result = { url: data.url, quality: data.quality || 'HI_RES' };
                }
            } else {
                const target = `${QOBUZ_BASE}/api/track/stream?id=${id}`;
                const res = await fetch(target);
                const data = await res.json();

                if (data.url) {
                    result = { url: data.url, quality: data.quality || 'LOSSLESS' };
                }
            }
        }

        // --- 3. ALBUM HANDLER ---
        else if (type === 'album' && id) {
            // Basic implementation for album tracks
            // This depends on the exact proxy API which we'd need to verify dynamically
            // For now return empty or implement similar to search
            result = { success: false, error: 'Album fetching not fully mapped yet' };
        }

        if (result) {
            return NextResponse.json({ success: true, ...result });
        } else {
            return NextResponse.json({ success: false, error: 'No data found' }, { status: 404 });
        }

    } catch (error) {
        console.error("HiFi Proxy Error:", error);
        return NextResponse.json({ success: false, error: 'Proxy Error' }, { status: 500 });
    }
}
