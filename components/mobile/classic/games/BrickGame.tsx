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
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

    // UI State (only for render)
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'gameover' | 'won'>('playing');

    // Game Logic Refs (Mutable, High Frequency)
    const paddleX = useRef(SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2);
    const targetPaddleX = useRef(SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2);
    const ball = useRef({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 30, dx: 3, dy: -3 });
    const lastFrameTime = useRef(0);
    const bricks = useRef<{ x: number, y: number, active: boolean }[]>([]);
    const scoreRef = useRef(0);
    const activeBricksRef = useRef(0);
    const animationFrameId = useRef<number>(0);
    const gameRunning = useRef(false);

    // Initialize Game
    const initGame = useCallback(() => {
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
        activeBricksRef.current = newBricks.length;

        // Reset Stats
        paddleX.current = SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2;
        targetPaddleX.current = SCREEN_WIDTH / 2 - PADDLE_WIDTH / 2;
        ball.current = { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT - 30, dx: 180, dy: -180 }; // pixels per second
        lastFrameTime.current = 0;
        scoreRef.current = 0;
        setScore(0);
        setGameState('playing');
        gameRunning.current = true;
    }, []);

    // Handle Input
    useEffect(() => {
        const handleScroll = (e: Event) => {
            if (!gameRunning.current) return;
            const customEvent = e as CustomEvent;
            const direction = customEvent.detail;
            const move = direction * 25;
            targetPaddleX.current = Math.max(0, Math.min(SCREEN_WIDTH - PADDLE_WIDTH, targetPaddleX.current + move));
        };

        window.addEventListener('ipod-scroll', handleScroll);
        return () => window.removeEventListener('ipod-scroll', handleScroll);
    }, []);

    // Game Loop
    const loop = useCallback((timestamp: number = 0) => {
        if (!canvasRef.current || !gameRunning.current) return;

        // Delta-time for frame-rate independence (target 60fps = 16.67ms)
        if (!lastFrameTime.current) lastFrameTime.current = timestamp;
        const deltaMs = Math.min(timestamp - lastFrameTime.current, 33); // Cap at ~30fps to avoid spiral
        const dt = deltaMs / 1000; // seconds
        lastFrameTime.current = timestamp;

        // Cache Context
        if (!ctxRef.current) {
            ctxRef.current = canvasRef.current.getContext('2d', { alpha: false });
        }
        const ctx = ctxRef.current;
        if (!ctx) return;

        // --- UPDATE ---

        // Paddle Physics
        paddleX.current += (targetPaddleX.current - paddleX.current) * 0.3;

        // Ball Physics (dt-based)
        let { x, y, dx, dy } = ball.current;
        x += dx * dt;
        y += dy * dt;

        // Wall Collisions
        if (x + BALL_SIZE > SCREEN_WIDTH || x < 0) {
            dx = -dx;
            // Clamp to avoid sticking
            x = x < 0 ? 0 : SCREEN_WIDTH - BALL_SIZE;
        }
        if (y < 0) {
            dy = -dy;
            y = 0;
        }
        if (y > SCREEN_HEIGHT) {
            gameRunning.current = false;
            setGameState('gameover');
            return;
        }

        // Paddle Collision
        if (
            y + BALL_SIZE >= SCREEN_HEIGHT - PADDLE_HEIGHT - 5 &&
            y <= SCREEN_HEIGHT - 5 && // Allow hitting top of paddle
            x + BALL_SIZE >= paddleX.current &&
            x <= paddleX.current + PADDLE_WIDTH
        ) {
            // Only bounce if moving down
            if (dy > 0) {
                dy = -Math.abs(dy); // Ensure up direction
                // English/Espin
                const hitPoint = (x + BALL_SIZE / 2) - (paddleX.current + PADDLE_WIDTH / 2);
                dx += hitPoint * 9; // Scale for per-second velocity
                dx = Math.max(-300, Math.min(300, dx));
                // Move out of paddle to avoid stuck ball
                y = SCREEN_HEIGHT - PADDLE_HEIGHT - 5 - BALL_SIZE - 1;
            }
        }

        // Brick Collision
        // Optimization: Stop checking after one brick hit per frame to prevent "ghosting" through multiple
        let brickHit = false;
        for (let i = 0; i < bricks.current.length; i++) {
            const brick = bricks.current[i];
            if (brick.active) {
                if (
                    x + BALL_SIZE > brick.x &&
                    x < brick.x + BRICK_WIDTH &&
                    y + BALL_SIZE > brick.y &&
                    y < brick.y + BRICK_HEIGHT
                ) {
                    brick.active = false;
                    dy = -dy;
                    brickHit = true;
                    scoreRef.current += 10;
                    activeBricksRef.current--;
                    setScore(scoreRef.current); // Sync Score UI
                    break; // Critical Fix: One collision per frame
                }
            }
        }

        if (activeBricksRef.current === 0) {
            gameRunning.current = false;
            setGameState('won');
            return;
        }

        ball.current = { x, y, dx, dy };

        // --- DRAW ---

        // Clear
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Paddle
        const gradient = ctx.createLinearGradient(paddleX.current, 0, paddleX.current + PADDLE_WIDTH, 0);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(0.5, '#3b82f6');
        gradient.addColorStop(1, '#2563eb');
        ctx.fillStyle = gradient;
        ctx.fillRect(paddleX.current, SCREEN_HEIGHT - PADDLE_HEIGHT - 5, PADDLE_WIDTH, PADDLE_HEIGHT);

        // Ball
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + BALL_SIZE / 2, y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        // Bricks
        // draw only active
        bricks.current.forEach((brick, index) => {
            if (brick.active) {
                const row = Math.floor(index / BRICK_COLS);
                const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16'];
                ctx.fillStyle = colors[row % colors.length];
                ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
            }
        });

        animationFrameId.current = requestAnimationFrame(loop);
    }, []);

    // Start Loop
    useEffect(() => {
        initGame();
        lastFrameTime.current = 0;
        animationFrameId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [loop, initGame]);

    return (
        <div className="w-full h-full relative bg-zinc-900 border-2 border-zinc-700 overflow-hidden select-none">
            <canvas
                ref={canvasRef}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                className="w-full h-full block image-rendering-pixelated"
            />

            {/* UI Overlay */}
            <div className="absolute top-1 left-2 text-[10px] items-center font-mono text-white opacity-50 flex gap-2 pointer-events-none">
                <span>SCORE: {score}</span>
            </div>

            {gameState === 'gameover' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10"
                >
                    <h2 className="text-xl font-bold text-red-500 mb-2">GAME OVER</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <div className="flex gap-2">
                        <button onClick={() => {
                            initGame();
                            lastFrameTime.current = 0;
                            requestAnimationFrame(loop);
                        }} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-200 transition-colors">Try Again</button>
                        <button onClick={onBack} className="bg-zinc-800 text-white text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-700 transition-colors">Exit</button>
                    </div>
                </motion.div>
            )}

            {gameState === 'won' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-10"
                >
                    <h2 className="text-xl font-bold text-green-500 mb-2">YOU WON!</h2>
                    <p className="text-xs mb-4">Score: {score}</p>
                    <div className="flex gap-2">
                        <button onClick={() => {
                            initGame();
                            lastFrameTime.current = 0;
                            requestAnimationFrame(loop);
                        }} className="bg-white text-black text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-200 transition-colors">Play Again</button>
                        <button onClick={onBack} className="bg-zinc-800 text-white text-[10px] px-3 py-1 rounded-full font-bold hover:bg-zinc-700 transition-colors">Exit</button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
