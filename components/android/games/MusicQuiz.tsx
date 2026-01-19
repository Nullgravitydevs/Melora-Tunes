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
    const { queue, mixes } = usePlayback();
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [answered, setAnswered] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [totalSongs, setTotalSongs] = useState(0);
    // Fixed stats
    const POINTS_PER_Q = 5;
    const MAX_QUESTIONS = 10;

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

        const availableCount = uniqueSongs.length;
        setTotalSongs(availableCount);

        if (availableCount < 4) {
            // Not enough songs for quiz
            return;
        }

        const numQuestions = Math.min(availableCount, MAX_QUESTIONS);

        const generateQuestion = (usedSongs: Set<string>): Question | null => {
            // Get songs not yet used as the CORRECT answer
            const availableForQuestion = uniqueSongs.filter(s => !usedSongs.has(s.id));
            if (availableForQuestion.length === 0) return null;

            const correctSong = availableForQuestion[Math.floor(Math.random() * availableForQuestion.length)];
            const options: JioSaavnSong[] = [correctSong];

            // Add 3 random wrong answers (can be any song except correct one)
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
        const usedAsAnswer = new Set<string>();

        for (let i = 0; i < numQuestions; i++) {
            const question = generateQuestion(usedAsAnswer);
            if (question) {
                qs.push(question);
                usedAsAnswer.add(question.correctSong.id);
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
            setScore(prev => prev + POINTS_PER_Q);
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
            // Block extra inputs if already answering
            if (!answered) handleAnswer();
        };

        window.addEventListener('ipod-select', handleSelect);
        return () => window.removeEventListener('ipod-select', handleSelect);
    }, [handleAnswer, answered]);

    const currentQ = questions[currentQuestion];
    const maxScore = questions.length * POINTS_PER_Q;

    if (questions.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center p-4">
                    <p className="text-sm mb-2">You have {totalSongs} song{totalSongs !== 1 ? 's' : ''}</p>
                    <p className="text-sm mb-4">Need at least 4 songs in playlists to play!</p>
                    <button onClick={onBack} className="bg-white text-black text-xs px-3 py-1 rounded-full font-bold">Back</button>
                    <div className="mt-4 text-[9px] text-zinc-500">Add songs to any playlist to start.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative bg-zinc-900 text-white overflow-hidden font-sans">
            {!gameOver ? (
                <>
                    {/* Header */}
                    <div className="h-7 bg-gradient-to-b from-zinc-800 to-zinc-900 border-b border-zinc-700 flex items-center justify-between px-2 shrink-0">
                        <span className="text-[10px] font-bold text-zinc-300">Music Quiz</span>
                        <div className="flex gap-2 text-[10px] font-mono text-zinc-400">
                            <span>{currentQuestion + 1} of {questions.length}</span>
                            <span className="text-white font-bold">{score}</span>
                        </div>
                    </div>

                    {/* Question Area */}
                    <div className="p-4 border-b border-zinc-800 bg-black/30">
                        <p className="text-[11px] font-bold text-center mb-1 text-zinc-300 uppercase tracking-widest">Identify The Track</p>
                        {currentQ && (
                            <div className="text-center mt-2">
                                <p className="text-xs text-zinc-400 mb-1">Artist</p>
                                <p className="text-sm font-bold text-white leading-tight">{currentQ.correctSong.primaryArtists.split(',')[0]}</p>
                            </div>
                        )}
                    </div>

                    {/* Options List */}
                    <div className="flex-1 overflow-auto py-1">
                        {currentQ && currentQ.options.map((song, index) => {
                            const isSelected = index === selectedIndex;
                            const showResult = answered;
                            const isThisCorrect = index === currentQ.correctIndex;

                            let bgColor = isSelected ? 'bg-blue-600' : 'transparent';
                            let textColor = isSelected ? 'text-white' : 'text-zinc-300';

                            if (showResult) {
                                if (isThisCorrect) {
                                    bgColor = 'bg-green-600 animate-pulse';
                                    textColor = 'text-white';
                                } else if (isSelected && !isThisCorrect) {
                                    bgColor = 'bg-red-600';
                                    textColor = 'text-white';
                                }
                            }

                            return (
                                <div
                                    key={song.id}
                                    className={`px-3 py-2 mx-1 rounded-md mb-1 flex flex-col justify-center ${bgColor} ${textColor} transition-all duration-200`}
                                >
                                    <p className="text-xs font-semibold truncate">{decodeHtml(song.name)}</p>
                                    {/* <p className="text-[9px] opacity-70 truncate">{song.album?.name || ''}</p> */}
                                    {/* Hide album to make it harder? Or keep it? Keeping it helps identify. */}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer / Instructions */}
                    <div className="p-1 border-t border-zinc-800 text-center bg-black/20">
                        <p className="text-[9px] text-zinc-500">
                            {!answered ? "Scroll to Select  •  Center to Guess" : (isCorrect ? "Correct!" : "Wrong Answer")}
                        </p>
                    </div>
                </>
            ) : (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-50"
                >
                    <div className="mb-4 text-center">
                        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-purple-500 mb-1">Quiz Finished</h2>
                        <div className="h-1 w-20 bg-zinc-800 mx-auto rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${(score / maxScore) * 100}%` }} />
                        </div>
                    </div>

                    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 shadow-2xl flex flex-col items-center gap-2 mb-6 w-64">
                        <span className="text-xs text-zinc-500 uppercase tracking-widest">Final Score</span>
                        <div className="text-4xl font-mono font-bold text-white">
                            {score} <span className="text-lg text-zinc-600">/ {maxScore}</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1">
                            {score === maxScore ? "Perfect Score! 🏆" : score > maxScore / 2 ? "Great Job! 🎵" : "Keep Listening! 🎧"}
                        </p>
                    </div>

                    <div onClick={onBack} className="group cursor-pointer">
                        <div className="bg-white text-black text-xs px-6 py-2 rounded-full font-bold hover:scale-105 active:scale-95 transition-transform flex items-center gap-2">
                            <span>Main Menu</span>
                        </div>
                        <p className="text-[9px] text-zinc-600 mt-2 text-center group-hover:text-zinc-500 transition-colors">Press menu to exit</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
