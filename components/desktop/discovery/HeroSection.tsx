import React from "react";
import { Play, Heart, MoreHorizontal } from "lucide-react";
import { DiscoveryTheme } from "./DiscoveryLayout";

interface HeroSectionProps {
    theme: DiscoveryTheme;
}

export function HeroSection({ theme }: HeroSectionProps) {
    const isMidnight = theme === 'midnight';

    return (
        <div className="w-full relative h-[400px] mb-8 rounded-3xl overflow-hidden group">
            {/* Background Image (Simulated High Res) */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=2670&auto=format&fit=crop')` }}
            ></div>

            {/* Gradient Overlay - The "Cinematic" Look */}
            <div className={`absolute inset-0 bg-gradient-to-t ${isMidnight
                    ? 'from-black via-black/50 to-transparent'
                    : 'from-[#f5f5f7] via-[#f5f5f7]/50 to-transparent'
                }`}></div>

            {/* Content Content - Floating Glass Effect */}
            <div className="absolute bottom-0 left-0 p-10 w-full flex items-end justify-between">
                <div className="flex flex-col gap-4 max-w-2xl">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-2 backdrop-blur-md border ${isMidnight ? 'bg-white/10 border-white/20 text-white' : 'bg-black/5 border-black/10 text-black'
                        }`}>
                        Album of the Day
                    </span>

                    <h1 className={`text-6xl font-black tracking-tighter leading-tight ${isMidnight ? 'text-white drop-shadow-2xl' : 'text-gray-900'
                        }`}>
                        Starboy
                    </h1>

                    <div className="flex items-center gap-3 text-sm font-medium opacity-90">
                        <span className="bg-[#E50914] text-white px-1.5 rounded text-[10px] font-bold">E</span>
                        <span>The Weeknd</span>
                        <span className="opacity-50">•</span>
                        <span>R&B/Soul</span>
                        <span className="opacity-50">•</span>
                        <span className="flex items-center gap-1">
                            <span className="text-yellow-500">Hi-Res</span>
                            <span className="text-xs opacity-70 border px-1 rounded border-current">24bit/96kHz</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4 mt-4">
                        <button className={`h-14 px-8 rounded-full font-bold flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl ${isMidnight
                                ? 'bg-white text-black hover:bg-gray-200'
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}>
                            <Play fill="currentColor" size={24} />
                            Play Now
                        </button>

                        <button className={`w-14 h-14 rounded-full flex items-center justify-center border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${isMidnight
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                : 'bg-black/5 border-black/10 text-black hover:bg-black/10'
                            }`}>
                            <Heart size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
