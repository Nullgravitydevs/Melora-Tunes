import React from "react";
import { Download, Library, Plus } from "lucide-react";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";
import { TrackRow, getArt } from "../DiscoveryShared";

interface LibraryViewProps {
    playlists: Playlist[];
    downloads: any[];
    colors: any;
    setLastView: (view: any) => void;
    setActivePlaylistDetail: (pl: any) => void;
    setActiveView: (view: any) => void;
    handlePlay: (song: any, list?: any[]) => void;
}

export function LibraryView({
    playlists,
    downloads,
    colors: c,
    setLastView,
    setActivePlaylistDetail,
    setActiveView,
    handlePlay
}: LibraryViewProps) {
    return (
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">Your Library</h1>

            {/* Playlists */}
            <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">Playlists</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {playlists.map(pl => (
                        <div key={pl.id} className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer" onClick={() => {
                            setLastView('library');
                            setActivePlaylistDetail(pl);
                            setActiveView('playlist-detail');
                        }}>
                            <div className="w-full aspect-square bg-neutral-800 rounded-lg mb-3 flex items-center justify-center">
                                {pl.tracks[0] ? <img src={getArt(pl.tracks[0])} className="w-full h-full object-cover rounded-lg" /> : <Library size={32} className="text-white/20" />}
                            </div>
                            <p className="font-bold truncate">{pl.name}</p>
                            <p className="text-xs text-white/50">{pl.tracks.length} songs</p>
                        </div>
                    ))}
                    <div className="bg-white/5 p-4 rounded-xl hover:bg-white/10 cursor-pointer flex flex-col items-center justify-center border border-dashed border-white/20" onClick={() => {
                        const name = prompt("New Playlist Name");
                        if (name) PlaylistStore.createPlaylist(name);
                    }}>
                        <Plus size={32} className="text-white/50 mb-2" />
                        <p className="font-bold text-sm">New Playlist</p>
                    </div>
                </div>
            </div>

            {/* Downloads */}
            <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Download size={20} />
                    Downloads
                </h2>
                {downloads.length === 0 ? (
                    <div className="text-center opacity-50 py-10">
                        <p>No downloaded songs yet.</p>
                    </div>
                ) : (
                    downloads.map((item, i) => (
                        <TrackRow
                            key={item.id}
                            index={i + 1}
                            track={item}
                            colors={c}
                            isPlaying={false}
                            onPlay={() => handlePlay(item.original, downloads.map(d => d.original))}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
