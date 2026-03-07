import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

let TIDAL_APIS: string[] = [];
try {
    const endpoints = JSON.parse(process.env.NEXT_PUBLIC_TIDAL_ENDPOINTS || '[]');
    TIDAL_APIS = endpoints.map((e: any) => e.url).filter(Boolean);
} catch (e) {
    TIDAL_APIS = [
        'https://hifi-one.spotisaver.net',
        'https://hifi-two.spotisaver.net',
        'https://triton.squid.wtf',
    ];
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'song'; // 'song', 'album', or 'album_tracks'

    if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

    for (const api of TIDAL_APIS) {
        try {
            let url = '';
            if (type === 'album_tracks') {
                url = `${api}/album/?id=${encodeURIComponent(query)}`;
            } else {
                const proxyType = type === 'song' ? 's' : 'al';
                url = `${api}/search?${proxyType}=${encodeURIComponent(query)}`;
            }

            console.log(`[Audiophile Search] Fetching ${url}`);

            const res = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                signal: AbortSignal.timeout(10000)
            });

            if (!res.ok) continue;

            const proxyData = await res.json();

            // For Tidal endpoints derived from Spotisaver
            if (type === 'album_tracks') {
                if (proxyData?.data?.items) {
                    return NextResponse.json({ results: proxyData.data.items });
                } else if (proxyData?.items) {
                    return NextResponse.json({ results: proxyData.items });
                } else if (Array.isArray(proxyData?.data)) {
                    return NextResponse.json({ results: proxyData.data });
                }
            } else {
                if (proxyData?.items || proxyData?.data?.items) {
                    const items = proxyData.items || proxyData.data.items;
                    return NextResponse.json({ results: items });
                }
            }

        } catch (error) {
            console.warn(`[Audiophile Search] ${api} failed:`, error);
        }
    }

    return NextResponse.json({ error: 'All search proxies failed' }, { status: 502 });
}
