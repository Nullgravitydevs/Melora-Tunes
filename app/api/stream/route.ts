import { NextRequest, NextResponse } from 'next/server';
import { Innertube } from 'youtubei.js';

// Cache instance (reusing could be efficient, but problematic in Serverless? 
// For desktop app localhost it's fine to re-create or singleton)
let yt: Innertube | null = null;

async function getYt() {
    if (!yt) {
        yt = await Innertube.create();
    }
    return yt;
}

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    try {
        const youtube = await getYt();

        // Fetch video info
        const info = await youtube.getInfo(id);

        // Choose best audio format
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });

        if (!format) {
            return NextResponse.json({ error: "No audio stream found" }, { status: 404 });
        }

        // The URL is usually already deciphered by chooseFormat/getInfo interaction
        const url = format.decipher(youtube.session.player);

        return NextResponse.json({
            url: url,
            bitrate: format.bitrate,
            mimeType: format.mime_type
        });

    } catch (error: any) {
        console.error("Stream Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
