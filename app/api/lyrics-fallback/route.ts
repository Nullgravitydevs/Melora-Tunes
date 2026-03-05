import { NextResponse } from 'next/server';
import { applyRateLimit, sanitizeParam, addSecurityHeaders } from '@/lib/api-middleware';

export async function GET(request: Request) {
    const rateLimited = applyRateLimit(request);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);
    const track = sanitizeParam(searchParams.get('track'), 200);
    const artist = sanitizeParam(searchParams.get('artist'), 200);
    const album = sanitizeParam(searchParams.get('album'), 200);
    const duration = searchParams.get('duration');
    const language = sanitizeParam(searchParams.get('language'), 50);

    if (!track || !artist) {
        return NextResponse.json({ error: 'Track and Artist required' }, { status: 400 });
    }

    // Metadata Cleaning Utility
    const cleanMetadata = (text: string) => {
        return text
            .replace(/\s*\(.*\)/g, '') // Remove (Radio Edit), (Remastered), etc.
            .replace(/\s*-\s*.*/g, '') // Remove - Single, - EP, etc.
            .trim();
    };

    const cleanTrack = cleanMetadata(track);
    const cleanArtist = cleanMetadata(artist);

    // LRCLib API — Phase 1: Direct Get (Strict Match)
    let apiUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}&artist_name=${encodeURIComponent(cleanArtist)}`;
    if (album) apiUrl += `&album_name=${encodeURIComponent(cleanMetadata(album))}`;
    if (duration && /^\d+$/.test(duration)) apiUrl += `&duration=${duration}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);

    try {
        let res = await fetch(apiUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'MeloraTunes/1.0' }
        });

        let data: any = null;

        if (res.ok) {
            data = await res.json();
        } else if (res.status === 404) {
            // Phase 2: Search Fallback
            console.log(`[LRCLib] Direct get 404 for ${cleanTrack}. Trying search...`);
            const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanTrack} ${cleanArtist}`)}`;
            const searchRes = await fetch(searchUrl, {
                signal: controller.signal,
                headers: { 'User-Agent': 'MeloraTunes/1.0' }
            });

            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (Array.isArray(searchData) && searchData.length > 0) {
                    // Selection Logic: Prefer synced, then by duration match
                    const targetDuration = duration ? parseInt(duration) : 0;
                    const bestMatch = searchData.reduce((prev, curr) => {
                        // Priority 1: Has Synced Lyrics
                        if (curr.syncedLyrics && !prev.syncedLyrics) return curr;
                        if (!curr.syncedLyrics && prev.syncedLyrics) return prev;

                        // Priority 2: Duration Match (within 5s)
                        if (targetDuration > 0) {
                            const prevDiff = Math.abs(prev.duration - targetDuration);
                            const currDiff = Math.abs(curr.duration - targetDuration);
                            if (currDiff < prevDiff) return curr;
                        }
                        return prev;
                    }, searchData[0]);

                    data = bestMatch;
                    console.log(`[LRCLib] Found match via search: ${data.trackName}`);
                }
            }
        }

        if (!data) {
            return NextResponse.json({ error: 'Lyrics not found' }, { status: 404 });
        }

        // --- LANGUAGE HEURISTIC GUARD ---
        if (language) {
            const southIndianLangs = ['telugu', 'tamil', 'malayalam', 'kannada'];
            const songLang = language.toLowerCase().trim();

            if (southIndianLangs.includes(songLang)) {
                const lyricsText = (data.plainLyrics || data.syncedLyrics || '').toLowerCase();
                const hindiKeywords = ['hai', 'dil', 'mera', 'meri', 'kya', 'tera', 'teri', 'pyar', 'mujhe', 'tum', 'kabhi', 'nahi', 'karo', 'raha', 'aur', 'yeh', 'woh', 'main', 'ho', 'se', 'ke'];

                const words = lyricsText.split(/[\s\n\[\]\.\,]+/).filter(Boolean);
                let hindiMatches = 0;

                for (const word of words) {
                    if (hindiKeywords.includes(word)) hindiMatches++;
                }

                if (hindiMatches > 3) {
                    console.log(`[LRCLib] Rejected lyrics - Detected ${hindiMatches} Hindi keywords in a ${songLang} song.`);
                    return NextResponse.json({ error: 'Language mismatch detected' }, { status: 404 });
                }
            }
        }

        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
        return addSecurityHeaders(response);

    } catch (error: any) {
        if (error.name === 'AbortError') {
            return NextResponse.json({ error: 'Request timed out' }, { status: 504 });
        }
        console.error('Lyrics Fallback API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch fallback lyrics' }, { status: 500 });
    } finally {
        clearTimeout(timeout);
    }
}
