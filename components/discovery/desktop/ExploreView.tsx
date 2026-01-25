import React from "react";
import { motion } from "framer-motion";

// Mood Categories for Explore Screen (Per Spec)
const moodCategories = [
    { id: 'romance', name: 'Romance', gradient: 'from-rose-500 to-pink-600', icon: '❤️' },
    { id: 'chill', name: 'Chill', gradient: 'from-cyan-400 to-blue-500', icon: '🌊' },
    { id: 'party', name: 'Party', gradient: 'from-purple-500 to-pink-500', icon: '🎉' },
    { id: 'sad', name: 'Sad', gradient: 'from-slate-600 to-gray-800', icon: '💔' },
    { id: 'workout', name: 'Workout', gradient: 'from-orange-500 to-red-600', icon: '💪' },
    { id: 'focus', name: 'Focus', gradient: 'from-indigo-500 to-purple-600', icon: '🎯' },
    { id: 'sleep', name: 'Sleep', gradient: 'from-indigo-900 to-slate-900', icon: '🌙' },
    { id: 'travel', name: 'Travel', gradient: 'from-emerald-500 to-teal-600', icon: '✈️' },
    { id: 'feelgood', name: 'Feel Good', gradient: 'from-yellow-400 to-orange-500', icon: '☀️' }
];

interface ExploreViewProps {
    colors: any;
    setLastView: (view: any) => void;
    setActiveMood: (mood: any) => void;
    setActiveView: (view: any) => void;
}

export function ExploreView({
    colors: c,
    setLastView,
    setActiveMood,
    setActiveView
}: ExploreViewProps) {
    // Sexy gradient pairs for each mood
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
                        className="aspect-[3/2] rounded-2xl flex flex-col items-start justify-end p-5 cursor-pointer relative overflow-hidden group"
                        style={{
                            background: moodGradients[mood.id] || `linear-gradient(135deg, ${c.accent}, ${c.accent}99)`,
                            boxShadow: `0 8px 32px ${moodGradients[mood.id]?.includes('#FF6B9D') ? '#FF6B9D33' : c.accent + '33'}`
                        }}
                        whileHover={{ scale: 1.04, y: -6, boxShadow: `0 20px 50px ${c.accent}55` }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            // FIXED: Explore is active
                            setLastView('explore');
                            setActiveMood(mood);
                            setActiveView('mood-detail');
                        }}
                    >
                        {/* Glassmorphism Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                        {/* Animated Shine Effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        </div>

                        {/* Icon - Large & Centered */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-125 transition-all duration-500">
                            {mood.icon}
                        </div>

                        {/* Content */}
                        <div className="relative z-10">
                            <span className="text-lg font-bold text-white drop-shadow-lg tracking-wide">{mood.name}</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-0.5 bg-white/60 rounded-full" />
                                <span className="text-[10px] text-white/50 uppercase tracking-widest">Mood</span>
                            </div>
                        </div>

                        {/* Corner Accent */}
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Export for DesktopDiscovery use
export { moodCategories };
