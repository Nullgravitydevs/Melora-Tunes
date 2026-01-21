import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Song ID required' }, { status: 400 });
    }

    // JioSaavn Song Details API
    const apiUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&_format=json&pids=${id}&ctx=wap6dot0`;

    try {
        const res = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error(`JioSaavn API Error: ${res.status}`);
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Song Details API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch song details' }, { status: 500 });
    }
}
