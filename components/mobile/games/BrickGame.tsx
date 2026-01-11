"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface BrickGameProps {
    onBack: () => void;
    // scrollDelta prop removed in favor of event listener
}

// Game Constants
const SCREEN_WIDTH = 280; // Approximate iPod screen width inner
const SCREEN_HEIGHT = 200; // Approximate iPod screen height inner
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

    // Game State Refs (for loop performance)
    const paddleX = useRef(SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2);
    const ball = useRef({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 30, dx: 2, dy: -2 });
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
                    y: BRICK_GAP + 20 + r * (BRICK_HEIGHT + BRICK_GAP), // 20px top padding
                    active: true
                });
            }
        }
        bricks.current = newBricks;
    }, []);

    // Handle Input (Direct Event Listener for Zero Latency)
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const customEvent = e as CustomEvent;
            const direction = customEvent.detail;
            const move = direction * 20; // Increased sensitivity
            paddleX.current = Math.max(0, Math.min(SCREEN_WIDTH - PADDLE_WIDTH, paddleX.current + move));
        };

        window.addEventListener('ipod-scroll', handleScroll);
        return () => window.removeEventListener('ipod-scroll', handleScroll);
    }, []);

    // Game Loop
    const loop = useCallback(() => {
        if (isPaused.current || gameOver || gameWon) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear Screen
        ctx.fillStyle = "#000000"; // Retro Greenish Bg? Or Black? Let's go Black for "Modern" iPod
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
            y + BALL_SIZE >= SCREEN_HEIGHT - PADDLE_HEIGHT - 5 && // Bottom area
            y + BALL_SIZE <= SCREEN_HEIGHT - 5 &&
            x + BALL_SIZE >= paddleX.current &&
            x <= paddleX.current + PADDLE_WIDTH
        ) {
            dy = -Math.abs(dy); // Bounce up
            // Add some "english" based on where it hit the paddle
            const hitPoint = (x + BALL_SIZE / 2) - (paddleX.current + PADDLE_WIDTH / 2);
            dx += hitPoint * 0.1;
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

        // Draw Paddle
        ctx.fillStyle = "#3b82f6"; // Blue paddle
        ctx.fillRect(paddleX.current, SCREEN_HEIGHT - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Draw Ball
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + BALL_SIZE / 2, y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Bricks
        bricks.current.forEach(brick => {
            if (brick.active) {
                // Gradient colors row by row logic could go here, simplicity for now
                ctx.fillStyle = "#ef4444"; // Red bricks
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <h2 className="text-xl font-bold text-red-500 mb-2">GAME OVER</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <button onClick={onBack} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold">Menu</button>
                    <p className="text-[9px] mt-4 text-zinc-500">Press Center to Exit</p>
                </div>
            )}

            {gameWon && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <h2 className="text-xl font-bold text-green-500 mb-2">YOU WON!</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <button onClick={onBack} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold">Menu</button>
                </div>
            )}
        </div>
    );
}
