import React, { useState } from "react";
import { motion } from "framer-motion";
import { Play, Loader2 } from "lucide-react";
import { SignalStore } from "@/lib/signal-store";
import { usePlayback, ensurePlayableTrack } from "@/components/providers/playback-context";
import { searchSongs } from "@/lib/jiosaavn";
import { DiscoveryEngine } from "@/lib/discovery-engine";

// Browse & Discover Data
const gradients = [
    'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #6366f1, #4f46e5)'
];

interface BrowseViewProps {
    colors: any;
    charts: any[];
    setLastView: (view: any) => void;
    setActiveCollection: (col: any) => void;
    setActiveView: (view: any) => void;
    setActiveChart: (chart: any) => void;
    setActiveDecade: (dec: any) => void;
    activeLanguage: string | null;
    selectedLanguages: string[];
}

// Intent Interface
interface BrowseIntent {
    id: string;
    name: string;
    query: string;
    type: 'collection' | 'theme' | 'decade' | 'chart';
    image?: string;
    subtitle?: string;
}

export function BrowseView({
    colors: c,
    charts,
    setLastView,
    setActiveCollection,
    setActiveView,
    setActiveChart,
    setActiveDecade,
    activeLanguage,
    selectedLanguages
}: BrowseViewProps) {
    const { playInstantMix } = usePlayback();
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // 1. Resolve Language Context (Same as HomeView)
    const langContext = activeLanguage || (selectedLanguages.length ? selectedLanguages.join(',') : 'english');

    const displayLanguage = activeLanguage
        ? activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)
        : null;

    // --- DATA DEFINITIONS ---

    const editorialCollections: BrowseIntent[] = [
        { id: 'bestofyear', name: 'Best of the Year', query: `${langContext} best songs`, type: 'collection' },
        { id: 'editorpicks', name: "Editor's Picks", query: `${langContext} hits`, type: 'collection' },
        { id: 'globalhits', name: 'Global Hits', query: `${langContext} global hits`, type: 'collection' },
        { id: 'indianhits', name: 'Indian Hits', query: `${langContext} indian hits`, type: 'collection' },
        { id: 'newtrending', name: 'New & Trending', query: `${langContext} new releases`, type: 'collection' }
    ];

    const themeMoments: BrowseIntent[] = [
        { id: 'latenightdrives', name: 'Late Night Drives', query: `${langContext} night drive songs`, type: 'theme' },
        { id: 'weekendparty', name: 'Weekend Party', query: `${langContext} party songs`, type: 'theme' },
        { id: 'longtravel', name: 'Long Travel', query: `${langContext} travel songs`, type: 'theme' },
        { id: 'studytime', name: 'Study Time', query: `${langContext} study music`, type: 'theme' },
        { id: 'morningenergy', name: 'Morning Energy', query: `${langContext} morning songs`, type: 'theme' }
    ];

    const decades: BrowseIntent[] = [
        { id: '1990s', name: 'The 1990s', query: `${langContext} 90s hits`, type: 'decade' },
        { id: '2000s', name: 'The 2000s', query: `${langContext} 2000s hits`, type: 'decade' },
        { id: '2010s', name: 'The 2010s', query: `${langContext} 2010s hits`, type: 'decade' },
        { id: '2020s', name: 'Best of 2020s', query: `${langContext} 2020s hits`, type: 'decade' }
    ];

    // --- ACTIONS ---

    const handleIntentClick = (intent: BrowseIntent, viewHandler: () => void) => {
        // Signal Intent
        SignalStore.addSignal({ id: `intent_${intent.type}_${intent.id}` } as any, 'CLICK', 'browse_navigation');
        viewHandler();
    };

    const handleQuickPlay = async (intent: BrowseIntent, e: React.MouseEvent) => {
        e.stopPropagation();
        if (generatingId) return;

        setGeneratingId(intent.id);
        try {
            // Signal Play Intent
            SignalStore.addSignal({ id: `intent_play_${intent.type}_${intent.id}` } as any, 'PLAY', 'browse_instant');

            // Strategy: Quick Search -> Seed -> Mix
            // We use the intent query to find a seed song
            const results = await searchSongs(intent.query, 1, 5, langContext);
            if (results && results.length > 0) {
                const seed = ensurePlayableTrack(results[0]);

                // Generate Discovery Mix from Seed
                // (Or simply play the result list? A generated mix is more dynamic)
                const mix = await DiscoveryEngine.generateSessionMix(seed);

                // Brand the Mix
                mix.title = `${intent.name} Radio`;
                mix.id = `browse-radio-${intent.id}-${Date.now()}`;
                mix.color = intent.type === 'theme' ? 'orange' : 'blue';

                playInstantMix(mix);
            } else {
                console.warn("No seeds found for quick play");
                // Should ideally show toast
            }

        } catch (err) {
            console.error("Browse Quick Play Failed", err);
        } finally {
            setGeneratingId(null);
        }
    };


    return (
        <div className="flex-1 px-8 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                    {displayLanguage ? `Browse ${displayLanguage} Music` : 'Browse & Discover'}
                </h1>
                <p className="text-white/50">Explore music by themes, eras, and collections</p>
            </div>

            {/* 1. Featured Editorial */}
            <section className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Featured Collections</h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                    {editorialCollections.map((item, i) => (
                        <motion.div
                            key={i}
                            className="min-w-[240px] h-[140px] rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 flex items-end cursor-pointer group relative overflow-hidden"
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleIntentClick(item, () => {
                                setLastView('browse');
                                setActiveCollection({ ...item, language: langContext });
                                setActiveView('collection-detail');
                            })}
                        >
                            <div className="absolute inset-0 opacity-20" style={{ background: gradients[i % gradients.length] }} />
                            <h3 className="text-2xl font-bold text-white relative z-10 leading-none">{item.name}</h3>

                            {/* Instant Play Button */}
                            <motion.div
                                className="absolute top-4 right-4 text-black p-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 active:scale-95"
                                onClick={(e) => handleQuickPlay(item, e)}
                            >
                                {generatingId === item.id ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Play size={16} fill="black" />
                                )}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 2. Charts & Rankings */}
            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">Charts & Rankings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {charts.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group relative"
                            onClick={() => {
                                // Manual Intent construction for Charts (dynamic data)
                                SignalStore.addSignal({ id: `intent_chart_${item.id || item.title}` } as any, 'CLICK', 'browse_chart');

                                setLastView('browse');
                                setActiveChart(item);
                                setActiveView('chart-detail');
                            }}
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 relative">
                                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                {/* Overlay Play on Chart Image */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play size={20} fill="white" className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-white leading-tight">{item.title}</h3>
                                <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">{item.subtitle}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. Themes & Moments */}
            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4">Themes & Moments</h2>
                <div className="flex gap-4 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
                    {themeMoments.map((item, i) => (
                        <div
                            key={i}
                            className="min-w-[160px] w-[160px] cursor-pointer group relative"
                            onClick={() => handleIntentClick(item, () => {
                                setLastView('browse');
                                setActiveCollection({ ...item, color: 'orange', language: langContext });
                                setActiveView('collection-detail');
                            })}
                        >
                            <div className="w-full aspect-square rounded-full overflow-hidden mb-3 relative border-2 border-transparent group-hover:border-white transition-colors">
                                <div className="w-full h-full opacity-60" style={{ background: gradients[i % gradients.length] }} />
                                <div className="absolute inset-0 flex items-center justify-center flex-col">
                                    <h3 className="text-lg font-bold text-white text-center px-2 drop-shadow-md">{item.name}</h3>
                                </div>

                                {/* Hover Play Overlay */}
                                <div
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    onClick={(e) => handleQuickPlay(item, e)}
                                >
                                    {generatingId === item.id ? (
                                        <Loader2 size={32} className="text-white animate-spin" />
                                    ) : (
                                        <Play size={40} fill="white" className="text-white/90 hover:scale-110 transition-transform" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Decades */}
            <section className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4">Rewind the Clock</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {decades.map((decade, i) => (
                        <div
                            key={i}
                            className="h-24 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center cursor-pointer relative overflow-hidden group"
                            onClick={() => handleIntentClick(decade, () => {
                                setLastView('browse');
                                setActiveDecade({ ...decade, language: langContext });
                                setActiveView('decade-detail');
                            })}
                        >
                            <span className="text-3xl font-black text-white/20 group-hover:text-white/40 transition-colors absolute scale-150 rotate-[-10deg]">{decade.id}</span>
                            <span className="text-xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform">{decade.name}</span>

                            {/* Decade Play Button */}
                            <motion.button
                                className="absolute right-2 bottom-2 p-2 bg-white text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-20 hover:scale-110"
                                onClick={(e) => handleQuickPlay(decade, e)}
                            >
                                {generatingId === decade.id ? (
                                    <Loader2 size={12} className="animate-spin" />
                                ) : (
                                    <Play size={12} fill="black" />
                                )}
                            </motion.button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
