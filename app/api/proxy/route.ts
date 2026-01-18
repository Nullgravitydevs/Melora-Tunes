import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.jiosaavn.com/api.php';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const apiUrl = new URL(BASE_URL);

    // Forward all params
    searchParams.forEach((value, key) => {
        apiUrl.searchParams.append(key, value);
    });

    try {
        const response = await fetch(apiUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from JioSaavn: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Proxy failed' }, { status: 502 });
    }
}
