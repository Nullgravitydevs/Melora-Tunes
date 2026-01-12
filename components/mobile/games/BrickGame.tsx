"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface BrickGameProps {
    onBack: () => void;
}

// Game Constants
const SCREEN_WIDTH = 280;
const SCREEN_HEIGHT = 200;
const PADDLE_WIDTH = 60;
const PADDLE_HEIGHT = 8;
const BALL_SIZE = 6;
const BRICK_Rows = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 12;
const BRICK_GAP = 2;
const BRICK_WIDTH = (SCREEN_WIDTH - (BRICK_COLS + 1) * BRICK_GAP) / BRICK_COLS;

export function BrickGame({ onBack }: BrickGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);

    // Game State Refs
    const paddleX = useRef(SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2);
    const targetPaddleX = useRef(SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2); // For smooth interpolation
    const ball = useRef({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 30, dx: 2.5, dy: -2.5 }); // Faster ball
    const bricks = useRef<{ x: number, y: number, active: boolean }[]>([]);
    const animationFrameId = useRef<number>(0);
    const isPaused = useRef(false);

    // Initialize Bricks
    useEffect(() => {
        const newBricks = [];
        for (let r = 0; r < BRICK_Rows; r++) {
            for (let c = 0; c < BRICK_COLS; c++) {
                newBricks.push({
                    x: BRICK_GAP + c * (BRICK_WIDTH + BRICK_GAP),
                    y: BRICK_GAP + 20 + r * (BRICK_HEIGHT + BRICK_GAP),
                    active: true
                });
            }
        }
        bricks.current = newBricks;
    }, []);

    // Handle Input - Smoother with higher sensitivity
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const customEvent = e as CustomEvent;
            const direction = customEvent.detail;
            const move = direction * 25; // Increased from 20 to 25 for better responsiveness
            targetPaddleX.current = Math.max(0, Math.min(SCREEN_WIDTH - PADDLE_WIDTH, targetPaddleX.current + move));
        };

        window.addEventListener('ipod-scroll', handleScroll);
        return () => window.removeEventListener('ipod-scroll', handleScroll);
    }, []);

    // Game Loop - Optimized
    const loop = useCallback(() => {
        if (isPaused.current || gameOver || gameWon) return;

        const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Smooth paddle interpolation (lerp) for buttery movement
        paddleX.current += (targetPaddleX.current - paddleX.current) * 0.3;

        // Clear Screen
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Update Ball
        let { x, y, dx, dy } = ball.current;
        x += dx;
        y += dy;

        // Wall Collisions
        if (x + BALL_SIZE > SCREEN_WIDTH || x < 0) dx = -dx;
        if (y < 0) dy = -dy;
        if (y + BALL_SIZE > SCREEN_HEIGHT) {
            setGameOver(true);
            return;
        }

        // Paddle Collision
        if (
            y + BALL_SIZE >= SCREEN_HEIGHT - PADDLE_HEIGHT - 5 &&
            y + BALL_SIZE <= SCREEN_HEIGHT - 5 &&
            x + BALL_SIZE >= paddleX.current &&
            x <= paddleX.current + PADDLE_WIDTH
        ) {
            dy = -Math.abs(dy);
            // English effect based on hit position
            const hitPoint = (x + BALL_SIZE / 2) - (paddleX.current + PADDLE_WIDTH / 2);
            dx += hitPoint * 0.15; // Increased from 0.1 for more responsive steering
            // Speed cap
            dx = Math.max(-4, Math.min(4, dx));
        }

        // Brick Collision
        let activeBricksCount = 0;
        bricks.current.forEach(brick => {
            if (brick.active) {
                activeBricksCount++;
                if (
                    x + BALL_SIZE > brick.x &&
                    x < brick.x + BRICK_WIDTH &&
                    y + BALL_SIZE > brick.y &&
                    y < brick.y + BRICK_HEIGHT
                ) {
                    brick.active = false;
                    dy = -dy;
                    setScore(prev => prev + 10);
                }
            }
        });

        if (activeBricksCount === 0) setGameWon(true);

        ball.current = { x, y, dx, dy };

        // Draw Paddle with gradient
        const gradient = ctx.createLinearGradient(paddleX.current, 0, paddleX.current + PADDLE_WIDTH, 0);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#2563eb');
        ctx.fillStyle = gradient;
        ctx.fillRect(paddleX.current, SCREEN_HEIGHT - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Draw Ball with glow
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(x + BALL_SIZE / 2, y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Bricks with color variation
        bricks.current.forEach((brick, index) => {
            if (brick.active) {
                const row = Math.floor(index / BRICK_COLS);
                const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'];
                ctx.fillStyle = colors[row % colors.length];
                ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
            }
        });

        animationFrameId.current = requestAnimationFrame(loop);
    }, [gameOver, gameWon]);

    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [loop]);

    return (
        <div className="w-full h-full relative bg-zinc-900 border-2 border-zinc-700 overflow-hidden">
            <canvas
                ref={canvasRef}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                className="w-full h-full block"
            />

            {/* UI Overlay */}
            <div className="absolute top-1 left-2 text-[10px] items-center font-mono text-white opacity-50 flex gap-2">
                <span>SCORE: {score}</span>
            </div>

            {gameOver && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white"
                >
                    <h2 className="text-xl font-bold text-red-500 mb-2">GAME OVER</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <button onClick={onBack} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-200 transition-colors">Menu</button>
                    <p className="text-[9px] mt-4 text-zinc-500">Press Center to Exit</p>
                </motion.div>
            )}

            {gameWon && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white"
                >
                    <h2 className="text-xl font-bold text-green-500 mb-2">YOU WON!</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <button onClick={onBack} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-200 transition-colors">Menu</button>
                </motion.div>
            )}
        </div>
    );
}
