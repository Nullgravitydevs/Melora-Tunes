import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { DiscoveryEngine } from "@/lib/discovery-engine";
import { SignalStore } from "@/lib/signal-store";
import { usePlayback, Mix, ensurePlayableTrack } from "@/components/providers/playback-context";
import { Play } from "lucide-react";

// Semantic Mood Schema (Ready for Deck Mode / Vector Search)
interface MoodIntent {
    id: string;
    name: string;
    gradient: string;
    icon: string;
    // Signals
    energy: number;   // 0.0 - 1.0
    valence: number;  // 0.0 (Sad) - 1.0 (Happy)
    tempo?: string;   // 'slow' | 'fast'
    tags: string[];
}

const moodCategories: MoodIntent[] = [
    { id: 'romance', name: 'Romance', gradient: 'from-rose-500 to-pink-600', icon: '❤️', energy: 0.4, valence: 0.8, tags: ['love', 'soft', 'acoustic'] },
    { id: 'chill', name: 'Chill', gradient: 'from-cyan-400 to-blue-500', icon: '🌊', energy: 0.3, valence: 0.5, tags: ['lofi', 'ambient', 'relax'] },
    { id: 'party', name: 'Party', gradient: 'from-purple-500 to-pink-500', icon: '🎉', energy: 0.9, valence: 0.9, tags: ['dance', 'club', 'pop'] },
    { id: 'sad', name: 'Sad', gradient: 'from-slate-600 to-gray-800', icon: '💔', energy: 0.2, valence: 0.1, tags: ['sad', 'lonely', 'ballad'] },
    { id: 'workout', name: 'Workout', gradient: 'from-orange-500 to-red-600', icon: '💪', energy: 0.85, valence: 0.7, tags: ['gym', 'rock', 'power'] },
    { id: 'focus', name: 'Focus', gradient: 'from-indigo-500 to-purple-600', icon: '🎯', energy: 0.5, valence: 0.5, tags: ['study', 'piano', 'instrumental'] },
    { id: 'sleep', name: 'Sleep', gradient: 'from-indigo-900 to-slate-900', icon: '🌙', energy: 0.1, valence: 0.3, tags: ['sleep', 'rain', 'night'] },
    { id: 'travel', name: 'Travel', gradient: 'from-emerald-500 to-teal-600', icon: '✈️', energy: 0.6, valence: 0.6, tags: ['roadtrip', 'drive', 'indie'] },
    { id: 'feelgood', name: 'Feel Good', gradient: 'from-yellow-400 to-orange-500', icon: '☀️', energy: 0.7, valence: 0.9, tags: ['happy', 'sunny', 'acoustic'] }
];

// Gradient Mapping for UI
const moodGradients: Record<string, string> = {
    romance: 'linear-gradient(135deg, #FF6B9D 0%, #C44569 50%, #9B2948 100%)',
    chill: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #5433a0 100%)',
    party: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #e91e63 100%)',
    sad: 'linear-gradient(135deg, #4b6cb7 0%, #182848 50%, #0f1624 100%)',
    workout: 'linear-gradient(135deg, #ff9a44 0%, #fc6076 50%, #e91e63 100%)',
    focus: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 50%, #667eea 100%)',
    sleep: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    travel: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 50%, #38ef7d 100%)',
    feelgood: 'linear-gradient(135deg, #f7971e 0%, #ffd200 50%, #f9d423 100%)'
};

interface ExploreViewProps {
    colors: any;
    setLastView?: (view: any) => void;
    setActiveMood: (mood: any) => void;
    setActiveView: (view: any) => void;
}

export function ExploreView({
    colors: c,
    setActiveMood,
    setActiveView
}: ExploreViewProps) {
    const { playInstantMix, currentTrack } = usePlayback();
    const [generatingMood, setGeneratingMood] = useState<string | null>(null);

    // One-Click Discovery Handler
    const handleMoodClick = useCallback(async (mood: MoodIntent, e: React.MouseEvent) => {
        // Stop bubbling
        e.stopPropagation();

        // 1. Signal Intent
        // We log "MOOD_CLICK" with context so Neural Engine learns what "Chill" means to user later
        SignalStore.addSignal({ id: `intent_${mood.id}` } as any, 'CLICK', 'mood_explore');

        // Optional: If holding shift, specific behavior? For now just standard.

        // 2. Play immediately if possible (or navigate)
        // If Play button clicked: Generate Mix
        // If Card clicked: Open Detail (User preference usually Detail view first, but let's offer instant play)

        // For now, standard behavior: Open Detail View.
        // But let's add a "Quick Play" button on hover.
        setActiveMood(mood);
        setActiveView('mood-detail');

    }, [setActiveMood, setActiveView]);

    const handleQuickPlay = useCallback(async (mood: MoodIntent, e: React.MouseEvent) => {
        e.stopPropagation();
        if (generatingMood) return;

        setGeneratingMood(mood.id);
        try {
            // Signal
            SignalStore.addSignal({ id: `intent_play_${mood.id}` } as any, 'PLAY', 'mood_instant');

            // Generate Mix using Seed (Current song? or just mood tags + user taste)
            // Ideally: DiscoveryEngine.generateMoodMix(mood.tags)
            // Fallback: Use tags to seed a session

            // SIMULATED MOOD MIX (Since DiscoveryEngine needs robust tag support)
            // We use the first tag as a query for "Unified Search" -> "Seed" -> "Mix"
            // Or better: Just open Detail screen and auto-click "Start Radio"?

            // Let's defer to Detail Screen for now to ensure quality
            setActiveMood(mood);
            setActiveView('mood-detail');

            // TODO: In Phase 6 (AI), replace this with `await DiscoveryEngine.generateMoodMix(mood)`

        } finally {
            setGeneratingMood(null);
        }
    }, [generatingMood, setActiveMood, setActiveView]);

    return (
        <div className="flex-1 px-8 py-6 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {/* Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
                    Explore
                </h1>
                <p className="text-white/50">Discover music for every mood ✨</p>
            </div>

            {/* Mood Destination Cards - Premium Glass Style */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {moodCategories.map((mood) => (
                    <motion.div
                        key={mood.id}
                        className="aspect-[3/2] rounded-2xl flex flex-col items-start justify-end p-5 cursor-pointer relative overflow-hidden group transform-gpu"
                        style={{
                            background: moodGradients[mood.id] || `linear-gradient(135deg, ${c.accent}, ${c.accent}99)`,
                            boxShadow: `0 8px 32px ${moodGradients[mood.id]?.includes('#FF6B9D') ? '#FF6B9D33' : c.accent + '33'}`
                        }}
                        whileHover={{ scale: 1.04, y: -6, boxShadow: `0 20px 50px ${c.accent}55` }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => handleMoodClick(mood, e)}
                    >
                        {/* Glassmorphism Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        {/* Animated Shine Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        </div>

                        {/* Icon - Large & Centered */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-125 transition-all duration-500 select-none">
                            {mood.icon}
                        </div>

                        {/* Hover Play Button (Quick Play) */}
                        <motion.button
                            onClick={(e) => handleQuickPlay(mood, e)}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                w-14 h-14 bg-white/10 backdrop-blur-md rounded-full border border-white/20
                                flex items-center justify-center
                                opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100
                                transition-all duration-300 z-20 hover:bg-white/20 active:scale-95"
                        >
                            {generatingMood === mood.id ? (
                                <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Play size={24} fill="white" className="ml-1" />
                            )}
                        </motion.button>

                        {/* Content */}
                        <div className="relative z-10 pointer-events-none">
                            <span className="text-lg font-bold text-white drop-shadow-lg tracking-wide">{mood.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                                <span className="text-[10px] text-white/50 uppercase tracking-widest">
                                    {mood.tags[0]}
                                </span>
                            </div>
                        </div>

                        {/* Corner Accent */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full pointer-events-none" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Export for DesktopDiscovery usage and Types
export { moodCategories };
