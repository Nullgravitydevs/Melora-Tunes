import { JioSaavnSong } from "./jiosaavn";

export async function fetchTidalEquivalent(amId: string) {
    // Helper function if needed later, but our backend proxy handles tidal translation natively now.
    const res = await fetch(`/api/audiophile?amId=${amId}`);
    if (!res.ok) throw new Error("Failed to resolve hi-res stream");
    return res.json();
}

/**
 * Transforms an Apple Music API track object into our native JioSaavnSong 
 * so it plays perfectly in our offline player.
 */
export function generateJioSaavnMetaFromApple(amTrack: any): JioSaavnSong {
    const artworkUrl = amTrack.artworkUrl100?.replace('100x100bb', '500x500bb') || "";

    return {
        id: `am_${amTrack.trackId}`, // Prefix to avoid JioSaavn ID collisions
        name: amTrack.trackName,
        type: "song",
        album: {
            id: `am_alb_${amTrack.collectionId}`,
            name: amTrack.collectionName || "",
            url: amTrack.collectionViewUrl || "",
        },
        year: new Date(amTrack.releaseDate).getFullYear().toString(),
        releaseDate: amTrack.releaseDate || "",
        duration: Math.round((amTrack.trackTimeMillis || 0) / 1000),
        label: "",
        primaryArtists: amTrack.artistName || "",
        primaryArtistsId: `am_art_${amTrack.artistId}`,
        featuredArtists: "",
        explicitContent: amTrack.trackExplicitness === "explicit" ? 1 : 0,
        playCount: 0,
        language: "english",
        hasLyrics: "false",
        url: amTrack.trackViewUrl || "",
        copyright: amTrack.copyright || "",
        image: [
            { quality: "50x50", link: amTrack.artworkUrl100?.replace('100x100bb', '50x50bb') || "" },
            { quality: "150x150", link: amTrack.artworkUrl100?.replace('100x100bb', '150x150bb') || "" },
            { quality: "500x500", link: artworkUrl }
        ],
        downloadUrl: [],
        encryptedMediaUrl: ""
    };
}
