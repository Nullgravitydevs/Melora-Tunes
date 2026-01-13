import { NextResponse } from 'next/server';

const BASE_URL = 'https://www.jiosaavn.com/api.php';
// Removed: export const dynamic = 'force-dynamic'; - conflicts with output: 'export'


export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        const apiUrl = new URL(BASE_URL);
        apiUrl.searchParams.append('__call', 'search.getResults');
        apiUrl.searchParams.append('_format', 'json');
        apiUrl.searchParams.append('_marker', '0');
        apiUrl.searchParams.append('ctx', 'web6dot0');
        apiUrl.searchParams.append('api_version', '4');
        apiUrl.searchParams.append('q', query);
        apiUrl.searchParams.append('n', '60'); // Fetch 60 results
        apiUrl.searchParams.append('p', '1');

        console.log(`Proxying search to: ${apiUrl.toString()} `);

        const response = await fetch(apiUrl.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from JioSaavn: ${response.status} `);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching from JioSaavn:', error);
        return NextResponse.json({ error: 'Failed to fetch from provider' }, { status: 502 });
    }
}
