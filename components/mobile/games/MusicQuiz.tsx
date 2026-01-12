"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { usePlayback } from "@/components/providers/playback-context";
import { JioSaavnSong } from "@/lib/jiosaavn";

interface MusicQuizProps {
    onBack: () => void;
}

interface Question {
    correctSong: JioSaavnSong;
    options: JioSaavnSong[];
    correctIndex: number;
}

export function MusicQuiz({ onBack }: MusicQuizProps) {
    const { queue, mixes } = usePlayback();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [totalSongs, setTotalSongs] = useState(0);
    const [pointsPerQuestion, setPointsPerQuestion] = useState(10);

    // Generate questions from user's mixes
    useEffect(() => {
        const allSongs: JioSaavnSong[] = [];
        mixes.forEach(mix => {
            allSongs.push(...mix.songs);
        });

        // Remove duplicates by song ID
        const uniqueSongs = allSongs.filter((song, index, self) =>
            index === self.findIndex(s => s.id === song.id)
        );

        if (uniqueSongs.length < 4) {
            // Not enough songs for quiz
            return;
        }

        setTotalSongs(uniqueSongs.length);
        const numQuestions = uniqueSongs.length; // One question per song
        setPointsPerQuestion(10); // Fixed 10 points per question

        const generateQuestion = (usedSongs: Set<string>): Question | null => {
            // Get songs not yet used
            const availableSongs = uniqueSongs.filter(s => !usedSongs.has(s.id));
            if (availableSongs.length === 0) return null;

            const correctSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
            const options: JioSaavnSong[] = [correctSong];

            // Add 3 random wrong answers
            while (options.length < 4) {
                const randomSong = uniqueSongs[Math.floor(Math.random() * uniqueSongs.length)];
                if (!options.find(s => s.id === randomSong.id)) {
                    options.push(randomSong);
                }
            }

            // Shuffle options
            const shuffled = options.sort(() => Math.random() - 0.5);
            const correctIndex = shuffled.findIndex(s => s.id === correctSong.id);

            return { correctSong, options: shuffled, correctIndex };
        };

        const qs: Question[] = [];
        const usedSongs = new Set<string>();

        for (let i = 0; i < numQuestions; i++) {
            const question = generateQuestion(usedSongs);
            if (question) {
                qs.push(question);
                usedSongs.add(question.correctSong.id);
            }
        }

        setQuestions(qs);
    }, [mixes]);

    // Handle scroll for option selection
    useEffect(() => {
        const handleScroll = (e: Event) => {
            if (answered) return;
            const customEvent = e as CustomEvent;
            const direction = customEvent.detail;
            setSelectedIndex(prev => {
                const next = prev + direction;
                if (next < 0) return 0;
                if (next > 3) return 3;
                return next;
            });
        };

        window.addEventListener('ipod-scroll', handleScroll);
        return () => window.removeEventListener('ipod-scroll', handleScroll);
    }, [answered]);

    const handleAnswer = useCallback(() => {
        if (answered || !questions[currentQuestion]) return;

        const isAnswerCorrect = selectedIndex === questions[currentQuestion].correctIndex;
        setIsCorrect(isAnswerCorrect);
        setAnswered(true);

        if (isAnswerCorrect) {
            setScore(prev => prev + pointsPerQuestion);
            if (navigator.vibrate) navigator.vibrate(10);
        } else {
            if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
        }

        // Move to next question after delay
        setTimeout(() => {
            if (currentQuestion + 1 >= questions.length) {
                setGameOver(true);
            } else {
                setCurrentQuestion(prev => prev + 1);
                setSelectedIndex(0);
                setAnswered(false);
            }
        }, 1500);
    }, [answered, selectedIndex, questions, currentQuestion]);

    // Handle center button for answering
    useEffect(() => {
        const handleSelect = () => {
            handleAnswer();
        };

        window.addEventListener('ipod-select', handleSelect);
        return () => window.removeEventListener('ipod-select', handleSelect);
    }, [handleAnswer]);

    const currentQ = questions[currentQuestion];

    if (questions.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center p-4">
                    <p className="text-sm mb-2">You have {totalSongs} song{totalSongs !== 1 ? 's' : ''}</p>
                    <p className="text-sm mb-4">Need at least 4 songs in playlists to play!</p>
                    <button onClick={onBack} className="bg-white text-black text-xs px-3 py-1 rounded-full font-bold">Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative bg-zinc-900 text-white overflow-hidden">
            {!gameOver ? (
                <>
                    {/* Header */}
                    <div className="p-2 border-b border-zinc-700">
                        <div className="flex justify-between text-[10px] font-mono mb-1">
                            <span>Q {currentQuestion + 1}/{questions.length}</span>
                            <span>SCORE: {score}</span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className="p-3 border-b border-zinc-700">
                        <p className="text-xs font-bold text-center mb-2">What song is this?</p>
                        {currentQ && (
                            <div className="text-center text-[10px] text-zinc-400">
                                <p>Artist: {currentQ.correctSong.primaryArtists}</p>
                            </div>
                        )}
                    </div>

                    {/* Options */}
                    <div className="flex-1 overflow-auto">
                        {currentQ && currentQ.options.map((song, index) => {
                            const isSelected = index === selectedIndex;
                            const showResult = answered;
                            const isThisCorrect = index === currentQ.correctIndex;

                            let bgColor = isSelected ? 'bg-blue-600' : 'bg-zinc-800';
                            if (showResult) {
                                if (isThisCorrect) bgColor = 'bg-green-600';
                                else if (isSelected && !isThisCorrect) bgColor = 'bg-red-600';
                            }

                            return (
                                <div
                                    key={song.id}
                                    className={`p-3 border-b border-zinc-700 ${bgColor} transition-colors`}
                                >
                                    <p className="text-xs font-semibold truncate">{song.name}</p>
                                    <p className="text-[10px] text-zinc-300 truncate">{song.album?.name || ''}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Instructions */}
                    <div className="p-2 border-t border-zinc-700 text-center text-[9px] text-zinc-500">
                        {!answered ? "Scroll to select • Press OK to answer" : (isCorrect ? "✓ Correct!" : "✗ Wrong!")}
                    </div>

                    {/* Handle center button press */}
                    <div className="absolute inset-0 pointer-events-none">
                        <button
                            onClick={handleAnswer}
                            className="sr-only"
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAnswer(); }}
                        />
                    </div>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/95"
                >
                    <h2 className="text-2xl font-bold text-blue-500 mb-3">Quiz Complete!</h2>
                    <p className="text-lg mb-2">Final Score: {score}</p>
                    <p className="text-sm text-zinc-400 mb-6">
                        {Math.floor((score / (questions.length * pointsPerQuestion)) * 100)}% Correct
                    </p>
                    <button
                        onClick={onBack}
                        className="bg-white text-black text-xs px-4 py-2 rounded-full font-bold hover:bg-zinc-200 transition-colors"
                    >
                        Back to Menu
                    </button>
                </motion.div>
            )}
        </div>
    );
}
