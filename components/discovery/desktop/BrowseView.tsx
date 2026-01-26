import React from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

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

    // 1. Resolve Language Context (Same as HomeView)
    const langContext = activeLanguage || (selectedLanguages.length ? selectedLanguages.join(',') : 'english');

    const displayLanguage = activeLanguage
        ? activeLanguage.charAt(0).toUpperCase() + activeLanguage.slice(1)
        : null;

    // 2. Dynamic Collections (Language Aware)
    const editorialCollections = [
        { id: 'bestofyear', name: 'Best of the Year', query: `${langContext} best songs` },
        { id: 'editorpicks', name: "Editor's Picks", query: `${langContext} hits` },
        { id: 'globalhits', name: 'Global Hits', query: `${langContext} global hits` },
        { id: 'indianhits', name: 'Indian Hits', query: `${langContext} indian hits` },
        { id: 'newtrending', name: 'New & Trending', query: `${langContext} new releases` }
    ];

    // 3. Dynamic Themes
    const themeMoments = [
        { id: 'latenightdrives', name: 'Late Night Drives', query: `${langContext} night drive songs` },
        { id: 'weekendparty', name: 'Weekend Party', query: `${langContext} party songs` },
        { id: 'longtravel', name: 'Long Travel', query: `${langContext} travel songs` },
        { id: 'studytime', name: 'Study Time', query: `${langContext} study music` },
        { id: 'morningenergy', name: 'Morning Energy', query: `${langContext} morning songs` }
    ];

    // 4. Dynamic Decades
    const decades = [
        { id: '1990s', name: 'The 1990s', query: `${langContext} 90s hits` },
        { id: '2000s', name: 'The 2000s', query: `${langContext} 2000s hits` },
        { id: '2010s', name: 'The 2010s', query: `${langContext} 2010s hits` },
        { id: '2020s', name: 'Best of 2020s', query: `${langContext} 2020s hits` }
    ];

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
                            onClick={() => {
                                setLastView('browse');
                                setActiveCollection({ ...item, language: langContext });
                                setActiveView('collection-detail');
                            }}
                        >
                            <div className="absolute inset-0 opacity-20" style={{ background: gradients[i % gradients.length] }} />
                            <h3 className="text-2xl font-bold text-white relative z-10 leading-none">{item.name}</h3>
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black p-2 rounded-full">
                                <Play size={16} fill="black" />
                            </div>
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
                            className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                            onClick={() => {
                                setLastView('browse');
                                setActiveChart(item);
                                setActiveView('chart-detail');
                            }}
                        >
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
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
                            className="min-w-[160px] w-[160px] cursor-pointer group"
                            onClick={() => {
                                setLastView('browse');
                                setActiveCollection({ ...item, color: 'orange', language: langContext });
                                setActiveView('collection-detail');
                            }}
                        >
                            <div className="w-full aspect-square rounded-full overflow-hidden mb-3 relative border-2 border-transparent group-hover:border-white transition-colors">
                                <div className="w-full h-full opacity-60" style={{ background: gradients[i % gradients.length] }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <h3 className="text-lg font-bold text-white text-center px-2 drop-shadow-md">{item.name}</h3>
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
                            onClick={() => {
                                setLastView('browse');
                                setActiveDecade({ ...decade, language: langContext });
                                setActiveView('decade-detail');
                            }}
                        >
                            <span className="text-3xl font-black text-white/20 group-hover:text-white/40 transition-colors absolute scale-150 rotate-[-10deg]">{decade.id}</span>
                            <span className="text-xl font-bold text-white relative z-10 group-hover:scale-110 transition-transform">{decade.name}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
