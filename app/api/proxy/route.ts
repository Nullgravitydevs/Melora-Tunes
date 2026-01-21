import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();

    if (!queryString) {
        return NextResponse.json({ error: 'Parameters required' }, { status: 400 });
    }

    // Forward to JioSaavn
    const apiUrl = `https://www.jiosaavn.com/api.php?${queryString}`;

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
        console.error('Proxy API Error:', error);
        return NextResponse.json({ error: 'Failed to proxy request' }, { status: 500 });
    }
}
