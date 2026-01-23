import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Robustly remove 'action' from params
    const forwardParams = new URLSearchParams(searchParams.toString());
    forwardParams.delete('action');
    const query = forwardParams.toString();

    if (!action) {
        return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }

    // Failover Strategy: Primary -> Backup
    const endpoints = [
        `https://apic-desktop.musixmatch.com/ws/1.1/${action}?${query}`,
        `https://www.musixmatch.com/ws/1.1/${action}?${query}` // Backup
    ];

    let lastError = null;

    for (const apiUrl of endpoints) {
        try {
            // console.log(`[Musixmatch Proxy] Attempting: ${apiUrl}`);
            const res = await fetch(apiUrl, {
                headers: {
                    'Origin': 'https://www.musixmatch.com',
                    'Referer': 'https://www.musixmatch.com/',
                    // Forward client cookies (session) or exclude if problematic. 
                    // Since "fetch failed" might be cookie related blocking, let's try WITHOUT cookies for now or add them back if needed.
                    // Audion sends cookies.
                    'Cookie': request.headers.get('cookie') || '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            // If 403 or 404, we might want to try next endpoint?
            // "Cannot GET" was 404 likely.
            if (res.status === 404 || res.status === 403) {
                // Try next endpoint
                lastError = new Error(`Upstream ${res.status}`);
                continue;
            }

            // Determine body
            let data;
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                // If text is not JSON, it's likely an error page
                if (!res.ok) throw new Error(text);
                try {
                    data = JSON.parse(text);
                } catch {
                    // HTML response usually means blocked/error
                    lastError = new Error(`Invalid JSON: ${text.substring(0, 100)}...`);
                    continue;
                }
            }

            const response = NextResponse.json(data, { status: res.status });

            // Forward Set-Cookie
            const setCookie = res.headers.get('set-cookie');
            if (setCookie) {
                response.headers.set('Set-Cookie', setCookie);
            }

            return response;

        } catch (e: any) {
            // console.warn(`[Musixmatch Proxy] Failed ${apiUrl}:`, e.message);
            lastError = e;
            // Continue to next endpoint
        }
    }

    // If all failed
    return NextResponse.json({
        error: 'All upstreams failed',
        details: lastError?.message
    }, { status: 502 });
}
