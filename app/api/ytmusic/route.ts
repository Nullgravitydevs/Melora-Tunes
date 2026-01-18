import { NextRequest, NextResponse } from 'next/server';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Content-Type': 'application/json',
    'Cookie': 'SOCS=CAESEwgDEgk0ODEyMzMyNTYaAmVuIAEaBgiA_LyaBg; CONSENT=YES+cb.20210328-17-p0.en+FX+474',
    'Origin': 'https://music.youtube.com',
    'Referer': 'https://music.youtube.com/',
};

interface YTMContext {
    apiKey: string;
    clientVersion: string;
    visitorData?: string;
}

// Helper to bootstrap context from the home page
async function getContext(): Promise<YTMContext> {
    const response = await fetch('https://music.youtube.com/', {
        headers: { ...HEADERS, 'Content-Type': 'text/html' }
    });
    const html = await response.text();

    const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
    const clientVersion = html.match(/"clientVersion":"([^"]+)"/)?.[1];
    const visitorData = html.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];

    if (!apiKey || !clientVersion) {
        throw new Error("Failed to extract API details from YTMS");
    }

    return { apiKey, clientVersion, visitorData };
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'home';

    try {
        // 1. Bootstrap (Get API Key & Context)
        const ctx = await getContext();

        // 2. Prepare API Request
        const contextBody = {
            context: {
                client: {
                    clientName: "WEB_REMIX",
                    clientVersion: ctx.clientVersion,
                    hl: "en",
                    gl: "US",
                    visitorData: ctx.visitorData
                }
            }
        };

        let apiUrl = "";
        let body: any = {};

        if (type === 'home') {
            apiUrl = `https://music.youtube.com/youtubei/v1/browse?key=${ctx.apiKey}`;
            body = { ...contextBody, browseId: "FEmusic_home" };
        } else if (type === 'search' && query) {
            apiUrl = `https://music.youtube.com/youtubei/v1/search?key=${ctx.apiKey}`;
            body = { ...contextBody, query: query };
        } else {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // 3. Call YouTubei API
        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: HEADERS, // Content-Type is json
            body: JSON.stringify(body)
        });

        if (!apiRes.ok) {
            throw new Error(`API returned ${apiRes.status}`);
        }

        const data = await apiRes.json();

        // 4. Parse Response (Different structure than HTML scraping, but similar renderer names)
        if (type === 'home') {
            const sections = parseHome(data);
            return NextResponse.json({ success: true, sections });
        } else {
            const results = parseSearch(data);
            return NextResponse.json({ success: true, results });
        }

    } catch (error: any) {
        console.error("YTMS API Proxy Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// --- Parsers ---

function parseHome(data: any) {
    const sections: any[] = [];
    const tabs = data.contents?.singleColumnBrowseResultsRenderer?.tabs;
    const content = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (content) {
        content.forEach((section: any) => {
            const musicCarousel = section.musicCarouselShelfRenderer;
            const musicImmersive = section.musicImmersiveCarouselShelfRenderer;

            if (musicCarousel) {
                const title = musicCarousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text;
                const items = musicCarousel.contents?.map((item: any) => parseMusicItem(item)).filter(Boolean);
                if (title && items?.length) {
                    sections.push({ title, type: 'carousel', items });
                }
            }

            if (musicImmersive) {
                const title = musicImmersive.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || "Featured";
                const items = musicImmersive.contents?.map((item: any) => parseMusicItem(item)).filter(Boolean);
                if (title && items?.length) {
                    sections.push({ title, type: 'immersive', items });
                }
            }
        });
    }
    return sections;
}

function parseSearch(data: any) {
    const results: any[] = [];
    const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs;
    const content = tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents;

    if (content) {
        content.forEach((section: any) => {
            const shelf = section.musicShelfRenderer;
            if (shelf) {
                const title = shelf.title?.runs?.[0]?.text;
                const items = shelf.contents?.map((item: any) => parseMusicItem(item)).filter(Boolean);
                if (items?.length) {
                    results.push({ title, items });
                }
            }
        });
    }
    return results;
}

function parseMusicItem(item: any) {
    // Parser for API response items (MusicResponsiveListItemRenderer)
    const mrl = item.musicResponsiveListItemRenderer;
    if (mrl) {
        const title = mrl.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        const id = mrl.playlistItemData?.videoId || mrl.navigationEndpoint?.watchEndpoint?.videoId;

        // Subtitle logic is slightly complex in API
        const subtitleRuns = mrl.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs;
        const subtitle = subtitleRuns?.map((r: any) => r.text).join('') || "";

        const thumb = mrl.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url;

        // Type inference (Video vs Song)
        // Usually, songs have "Song" in subtitle or a specific icon type, but checking subtitle is easiest/fuzzy
        let type = 'song';
        if (subtitle.includes("Video") || !mrl.playlistItemData) type = 'video';
        // Note: playlistItemData is often missing for simple video results

        return { title, id, subtitle, image: thumb, type };
    }

    // TwoRowItem (often used in carousels)
    const mtr = item.musicTwoRowItemRenderer;
    if (mtr) {
        const title = mtr.title?.runs?.[0]?.text;
        const subtitle = mtr.subtitle?.runs?.map((r: any) => r.text).join('');
        const id = mtr.navigationEndpoint?.browseEndpoint?.browseId || mtr.navigationEndpoint?.watchEndpoint?.videoId;
        const thumb = mtr.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.pop()?.url;

        // Type inference
        let type = 'song';
        if (id?.startsWith('MPRE')) type = 'album';
        else if (id?.startsWith('VL')) type = 'playlist';
        else if (subtitle.includes('Video')) type = 'video';

        return { title, id, subtitle, image: thumb, type };
    }

    return null;
}
