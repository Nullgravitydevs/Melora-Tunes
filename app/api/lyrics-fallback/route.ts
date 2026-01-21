import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const track = searchParams.get('track');
    const artist = searchParams.get('artist');

    if (!track || !artist) {
        return NextResponse.json({ error: 'Track and Artist required' }, { status: 400 });
    }

    // LRCLib API
    const apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;

    try {
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'MeloraTunes/1.0'
            }
        });

        if (!res.ok) {
            // LRCLib returns 404 if not found, we should handle gracefully
            if (res.status === 404) {
                return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
            }
            throw new Error(`LRCLib API Error: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Lyrics Fallback API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fallback lyrics' }, { status: 500 });
    }
}
