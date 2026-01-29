"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { usePlayback } from "@/components/providers/playback-context";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { decodeHtml } from "@/lib/utils";

interface MusicQuizProps {
    onBack: () => void;
}

interface Question {
    correctSong: JioSaavnSong;
    options: JioSaavnSong[];
    correctIndex: number;
}

export function MusicQuiz({ onBack }: MusicQuizProps) {
    const { mixes } = usePlayback(); // Only depend on mixes to generate questions once
    const [gameState, setGameState] = useState<'loading' | 'playing' | 'gameover' | 'error'>('loading');

    // Quiz State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectionState, setSelectionState] = useState<'idle' | 'correct' | 'wrong'>('idle');

    // Refs for Async/Event Safety
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef(false);
    const questionsRef = useRef<Question[]>([]);

    // Constants
    const POINTS_PER_Q = 5;
    const MAX_QUESTIONS = 10;

    // --- 1. Question Generation (Run Once or when Mixes Change significantly) ---
    useEffect(() => {
        // Debounce mix changes/ensure stable generation
        const generateQuestions = () => {
            const allSongs: JioSaavnSong[] = [];
            mixes.forEach(mix => {
                mix.songs.forEach(track => {
                    const song = 'song' in track ? track.song : track;
                    if (song) allSongs.push(song as JioSaavnSong);
                });
            });

            // Use Map for efficient deduplication by ID
            const uniqueSongsMap = new Map<string, JioSaavnSong>();
            allSongs.forEach(song => uniqueSongsMap.set(song.id, song));
            const uniqueSongs = Array.from(uniqueSongsMap.values());

            if (uniqueSongs.length < 4) {
                setGameState('error');
                return;
            }

            const numQuestions = Math.min(uniqueSongs.length, MAX_QUESTIONS);
            const qs: Question[] = [];
            const usedAsAnswer = new Set<string>();

            // Helper to get random songs
            const getRandomSong = (pool: JioSaavnSong[]) => pool[Math.floor(Math.random() * pool.length)];

            for (let i = 0; i < numQuestions; i++) {
                // Pick Correct Answer (not used before)
                const availableForAnswer = uniqueSongs.filter(s => !usedAsAnswer.has(s.id));
                if (availableForAnswer.length === 0) break;

                const correctSong = getRandomSong(availableForAnswer);
                usedAsAnswer.add(correctSong.id);

                // Option Pool (all songs except correct one)
                const optionPool = uniqueSongs.filter(s => s.id !== correctSong.id);
                if (optionPool.length < 3) break; // Should not happen given check above

                // Pick 3 Wrong Options
                const wrongOptions = new Set<JioSaavnSong>();
                while (wrongOptions.size < 3) {
                    wrongOptions.add(getRandomSong(optionPool));
                }

                // Combine and Shuffle
                const options = [correctSong, ...Array.from(wrongOptions)];
                // Fisher-Yates shuffle for better randomness
                for (let j = options.length - 1; j > 0; j--) {
                    const k = Math.floor(Math.random() * (j + 1));
                    [options[j], options[k]] = [options[k], options[j]];
                }

                const correctIndex = options.findIndex(s => s.id === correctSong.id);
                qs.push({ correctSong, options, correctIndex });
            }

            setQuestions(qs);
            questionsRef.current = qs;
            setGameState('playing');

            // Reset Game State
            setCurrentQIndex(0);
            setScore(0);
            setSelectedIndex(0);
            setSelectionState('idle');
            isProcessingRef.current = false;
        };

        generateQuestions();

        // Cleanup timeouts on unmount
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [mixes]); // Re-gen if mixes change

    // --- 2. Input Handling (Scoped & Safe) ---
    const handleAnswer = useCallback((index: number) => {
        if (isProcessingRef.current || gameState !== 'playing') return;

        isProcessingRef.current = true;
        const currentQ = questionsRef.current[currentQIndex];
        if (!currentQ) return; // Safety

        const isCorrect = index === currentQ.correctIndex;

        // Update UI immediately
        setSelectedIndex(index);
        setSelectionState(isCorrect ? 'correct' : 'wrong');

        if (isCorrect) {
            setScore(prev => prev + POINTS_PER_Q);
        }

        // Schedule Next Question
        timeoutRef.current = setTimeout(() => {
            if (currentQIndex < questionsRef.current.length - 1) {
                // Next Question
                setCurrentQIndex(prev => prev + 1);
                setSelectedIndex(0);
                setSelectionState('idle');
                isProcessingRef.current = false;
            } else {
                // Game Over
                setGameState('gameover');
                isProcessingRef.current = false;
            }
        }, 1500); // 1.5s delay to see result
    }, [currentQIndex, gameState]);

    useEffect(() => {
        const handleScroll = (e: Event) => {
            if (gameState !== 'playing' || isProcessingRef.current) return;
            const customEvent = e as CustomEvent;
            setSelectedIndex(prev => {
                const next = prev + customEvent.detail;
                return Math.max(0, Math.min(3, next)); // Assuming 4 options always
            });
        };

        const handleSelect = (e: Event) => {
            if (gameState !== 'playing' || isProcessingRef.current) return;
            // Use functional state to get fresh selectedIndex
            setSelectedIndex(currentIndex => {
                handleAnswer(currentIndex);
                return currentIndex;
            });
        };

        window.addEventListener('ipod-scroll', handleScroll);
        window.addEventListener('ipod-select', handleSelect);
        return () => {
            window.removeEventListener('ipod-scroll', handleScroll);
            window.removeEventListener('ipod-select', handleSelect);
        };
    }, [gameState, handleAnswer]);


    // --- 3. Render Views ---

    if (gameState === 'loading') {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                <span className="text-xs">Loading Quiz...</span>
            </div>
        );
    }

    if (gameState === 'error') {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-4 text-center">
                <h2 className="text-sm font-bold text-red-400 mb-2">Not Enough Songs</h2>
                <p className="text-[10px] text-zinc-400 mb-4">You need at least 4 unique songs in your library to play.</p>
                <button onClick={onBack} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold">Go Back</button>
            </div>
        );
    }

    if (gameState === 'gameover') {
        // Calculate dynamic max score based on actual generated questions
        const maxScore = questions.length * POINTS_PER_Q;
        const isPerfect = score === maxScore;

        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white p-4"
            >
                <h2 className="text-lg font-bold text-blue-400 mb-1">Quiz Complete!</h2>
                <div className="flex items-end gap-1 mb-4">
                    <span className="text-4xl font-bold">{score}</span>
                    <span className="text-sm text-zinc-500 mb-1">/ {maxScore}</span>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => {
                        // Reset
                        setGameState('loading');
                        setScore(0);
                        setCurrentQIndex(0);
                        setSelectionState('idle');
                        // Trigger re-gen via effect dependency or state
                        // (Changing gameState to 'loading' won't trigger effect unless we depend on it, 
                        // or we can just call generateQuestions if we extract it, 
                        // but forcing a re-mount by key or just resetting state works if effect monitors something.
                        // Current effect depends on [mixes]. We need to manually trigger logic.)
                        // Actually, since the effect runs ONCE on mount (deps [mixes]), we need to fix that loop.
                        // Best toggle: Set a 'retry' counter dependency.
                        // For now, simpler: Just exit and user enters again? 
                        // Or better: Reload logic.
                        // We will force a reload by toggling a state or we can just ignore reloading songs and just replay same questions?
                        // Ideally shuffle again.
                        // Let's just go back for now to keep it simple, or implement 'retry' state.
                        onBack();
                    }} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-200">Done</button>
                </div>
            </motion.div>
        );
    }

    // Playing View
    const currentQ = questions[currentQIndex];
    if (!currentQ) return null;

    return (
        <div className="w-full h-full flex flex-col bg-zinc-950 text-white relative overflow-hidden">
            {/* Header */}
            <div className="h-6 bg-zinc-900 flex items-center justify-between px-3 border-b border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400">Q{currentQIndex + 1}/{questions.length}</span>
                <span className="text-[10px] font-bold text-blue-400">{score} pts</span>
            </div>

            {/* Question Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 bg-zinc-800 rounded-lg mb-3 shadow-lg flex items-center justify-center overflow-hidden relative">
                    {/* Blurry Hint Image */}
                    <img
                        src={currentQ.correctSong.image[0]?.link}
                        alt="?"
                        className={`w-full h-full object-cover transition-all duration-500 ${selectionState !== 'idle' ? 'blur-0' : 'blur-md'}`}
                    />
                    {selectionState === 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl drop-shadow-md">🎵</span>
                        </div>
                    )}
                </div>

                <h3 className="text-xs font-medium text-zinc-300 mb-1">Which song is this?</h3>
            </div>

            {/* Options List */}
            <div className="bg-zinc-900 p-2 space-y-1">
                {currentQ.options.map((option, idx) => {
                    const isSelected = idx === selectedIndex;
                    let stateClass = '';

                    if (selectionState !== 'idle') {
                        if (idx === currentQ.correctIndex) stateClass = 'bg-green-600 text-white border-green-500'; // Correct Answer
                        else if (isSelected && selectionState === 'wrong') stateClass = 'bg-red-600 text-white border-red-500'; // Wrong Selection
                        else stateClass = 'opacity-50 grayscale border-transparent'; // Other
                    } else {
                        stateClass = isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700';
                    }

                    return (
                        <motion.div
                            key={`${option.id}-${idx}`}
                            className={`
                                h-8 px-3 rounded-md flex items-center text-[10px] font-medium border
                                transition-all cursor-pointer select-none
                                ${stateClass}
                            `}
                            onClick={() => handleAnswer(idx)}
                        >
                            <span className="mr-2 opacity-50 font-mono">{['A', 'B', 'C', 'D'][idx]}</span>
                            <span className="truncate">{decodeHtml(option.name)}</span>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer / Instructions */}
            <div className="p-1 border-t border-zinc-800 text-center bg-black/20">
                <p className="text-[9px] text-zinc-500">
                    {selectionState === 'idle' ? "Scroll to Select  •  Center to Guess" : (selectionState === 'correct' ? "Correct!" : "Wrong Answer")}
                </p>
            </div>
        </div>
    );
}
