"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ParachuteGameProps {
    onBack: () => void;
}

// Game Constants
const SCREEN_WIDTH = 280;
const SCREEN_HEIGHT = 200;
const TURRET_X = SCREEN_WIDTH / 2;
const TURRET_Y = SCREEN_HEIGHT - 20;
const TURRET_LENGTH = 20;

export function ParachuteGame({ onBack }: ParachuteGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Game State
    const turretAngle = useRef(270); // Degrees, 270 is up
    const projectiles = useRef<{ x: number, y: number, dx: number, dy: number, active: boolean }[]>([]);
    const enemies = useRef<{ x: number, y: number, speed: number, active: boolean }[]>([]);
    const animationFrameId = useRef<number>(0);
    const lastShotTime = useRef(0);

    // Handle Rotation (Scroll)
    useEffect(() => {
        const handleScroll = (e: Event) => {
            const customEvent = e as CustomEvent;
            const direction = customEvent.detail; // 1 or -1
            turretAngle.current += direction * 5; // Rotate 5 deg per tick

            // Clamp angle to "upwards" cone (avoid shooting into ground)
            // 270 is UP. Allow 180 (Left) to 360 (Right)
            if (turretAngle.current < 190) turretAngle.current = 190;
            if (turretAngle.current > 350) turretAngle.current = 350;
        };

        window.addEventListener('ipod-scroll', handleScroll);
        return () => window.removeEventListener('ipod-scroll', handleScroll);
    }, []);

    // Handle Shooting (Select)
    useEffect(() => {
        const handleSelect = () => {
            if (gameOver) return;

            const now = Date.now();
            if (now - lastShotTime.current < 200) return; // Fire rate limit
            lastShotTime.current = now;

            const rad = (turretAngle.current * Math.PI) / 180;
            const speed = 4;
            projectiles.current.push({
                x: TURRET_X + Math.cos(rad) * TURRET_LENGTH,
                y: TURRET_Y + Math.sin(rad) * TURRET_LENGTH,
                dx: Math.cos(rad) * speed,
                dy: Math.sin(rad) * speed,
                active: true
            });
        };

        window.addEventListener('ipod-select', handleSelect);
        return () => window.removeEventListener('ipod-select', handleSelect);
    }, [gameOver]);

    // Game Loop
    const loop = useCallback(() => {
        if (gameOver) return;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Draw Ground
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(0, SCREEN_HEIGHT - 10, SCREEN_WIDTH, 10);

        // Draw Turret
        const rad = (turretAngle.current * Math.PI) / 180;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(TURRET_X, TURRET_Y);
        ctx.lineTo(TURRET_X + Math.cos(rad) * TURRET_LENGTH, TURRET_Y + Math.sin(rad) * TURRET_LENGTH);
        ctx.stroke();

        // Base
        ctx.beginPath();
        ctx.arc(TURRET_X, TURRET_Y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Spawn Enemies
        if (Math.random() < 0.02) {
            enemies.current.push({
                x: Math.random() * (SCREEN_WIDTH - 20) + 10,
                y: -20,
                speed: 0.5 + Math.random() * 0.5,
                active: true
            });
        }

        // Update Projectiles
        projectiles.current.forEach(p => {
            p.x += p.dx;
            p.y += p.dy;
            if (p.x < 0 || p.x > SCREEN_WIDTH || p.y < 0 || p.y > SCREEN_HEIGHT) p.active = false;
        });

        // Update Enemies
        enemies.current.forEach(e => {
            e.y += e.speed;
            if (e.y > SCREEN_HEIGHT - 10) {
                // Landed!
                e.active = false;
                setGameOver(true); // Instant kill for now, maybe add lives later
            }
        });

        // Collisions
        projectiles.current.forEach(p => {
            if (!p.active) return;
            enemies.current.forEach(e => {
                if (!e.active) return;
                const dist = Math.hypot(p.x - e.x, p.y - e.y);
                if (dist < 10) {
                    p.active = false;
                    e.active = false;
                    setScore(prev => prev + 10);
                }
            });
        });

        // Cleanup
        projectiles.current = projectiles.current.filter(p => p.active);
        enemies.current = enemies.current.filter(e => e.active);

        // Draw Projectiles
        ctx.fillStyle = "#ffff00";
        projectiles.current.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw Enemies (Parachutes)
        enemies.current.forEach(e => {
            // Parachute
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(e.x, e.y - 5, 8, Math.PI, 0); // Semi-circle
            ctx.fill();
            // Man
            ctx.fillStyle = "#3b82f6";
            ctx.fillRect(e.x - 3, e.y, 6, 8);
        });

        animationFrameId.current = requestAnimationFrame(loop);
    }, [gameOver]);

    // Start/Stop Loop
    useEffect(() => {
        animationFrameId.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [loop]);

    return (
        <div className="w-full h-full relative bg-black overflow-hidden pointer-events-auto">
            <canvas
                ref={canvasRef}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                className="w-full h-full block"
            />

            <div className="absolute top-2 left-2 text-white font-mono text-xs">SCORE: {score}</div>

            {gameOver && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-50">
                    <h2 className="text-xl font-bold text-red-500 mb-2">GAME OVER</h2>
                    <p className="mb-4">Score: {score}</p>
                    <button onClick={onBack} className="bg-white text-black px-4 py-1 rounded-full font-bold text-xs">Menu</button>
                    <p className="text-[9px] mt-4 text-zinc-500">Press Menu to Exit</p>
                </div>
            )}
        </div>
    );
}
