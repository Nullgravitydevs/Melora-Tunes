import React, { useEffect, useRef, useState } from 'react';

interface ParachuteGameProps {
    isActive: boolean;
    scrollDirection?: 'left' | 'right' | null;
    onSelect?: () => void;
    onBack?: () => void;
}

interface GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    speed?: number;
    type: 'player' | 'bullet' | 'enemy' | 'particle';
}

export function ParachuteGame({ isActive, scrollDirection, onSelect, onBack }: ParachuteGameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);

    // Game State Refs (avoid re-renders during game loop)
    const playerRef = useRef<GameObject>({ x: 150, y: 200, width: 20, height: 20, type: 'player', color: '#00ff00' });
    const bulletsRef = useRef<GameObject[]>([]);
    const enemiesRef = useRef<GameObject[]>([]);
    const particlesRef = useRef<GameObject[]>([]);
    const frameIdRef = useRef<number>(0);
    const lastScrollRef = useRef<number>(0);

    // Load High Score
    useEffect(() => {
        const saved = localStorage.getItem('melora-parachute-highscore');
        if (saved) setHighScore(parseInt(saved));
    }, []);

    // Scroll Control Logic
    useEffect(() => {
        if (!isActive || gameOver) return;

        const now = Date.now();
        if (now - lastScrollRef.current < 50) return; // Debounce slightly

        if (scrollDirection === 'left') {
            playerRef.current.x = Math.max(10, playerRef.current.x - 15);
        } else if (scrollDirection === 'right') {
            playerRef.current.x = Math.min(290, playerRef.current.x + 15);
        }
        lastScrollRef.current = now;
    }, [scrollDirection, isActive, gameOver]);

    // Shoot Control
    useEffect(() => {
        if (!isActive) return;
        if (gameOver) {
            // Restart on select if game over
            resetGame();
        } else {
            // FIRE!
            bulletsRef.current.push({
                x: playerRef.current.x + 8, // Center of player
                y: playerRef.current.y,
                width: 4,
                height: 8,
                color: '#ffff00',
                speed: 5,
                type: 'bullet'
            });
        }
    }, [onSelect]);

    const resetGame = () => {
        setScore(0);
        setGameOver(false);
        playerRef.current = { x: 150, y: 200, width: 20, height: 20, type: 'player', color: '#00ff00' };
        bulletsRef.current = [];
        enemiesRef.current = [];
        particlesRef.current = [];
    };

    // Game Loop
    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset canvas size (iPod screen approx 320x240 usually, but let's fit container)
        canvas.width = 300;
        canvas.height = 220;

        let spawnTimer = 0;

        const loop = () => {
            if (gameOver) {
                // Draw Game Over Screen
                ctx.fillStyle = 'rgba(0,0,0,0.1)'; // Trail effect
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = 'white';
                ctx.font = '20px "Courier New"';
                ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 20);
                ctx.font = '12px "Courier New"';
                ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
                ctx.fillText("Press Center to Restart", canvas.width / 2, canvas.height / 2 + 30);

                frameIdRef.current = requestAnimationFrame(loop);
                return;
            }

            // Clear
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update Player
            // (Controlled by scroll effect above)

            // Spawn Enemies
            spawnTimer++;
            if (spawnTimer > 60 - Math.min(50, Math.floor(score / 5))) { // Difficulty ramps up
                spawnTimer = 0;
                enemiesRef.current.push({
                    x: Math.random() * (canvas.width - 20),
                    y: -20,
                    width: 20,
                    height: 20,
                    color: '#ff0000',
                    speed: 1 + (score / 50),
                    type: 'enemy'
                });
            }

            // Update Bullets
            bulletsRef.current.forEach((b, i) => {
                b.y -= b.speed!;
                if (b.y < -10) bulletsRef.current.splice(i, 1);
            });

            // Update Enemies
            enemiesRef.current.forEach((e, i) => {
                e.y += e.speed!;

                // Hit Floor Logic (Game Over)
                if (e.y > canvas.height) {
                    setGameOver(true);
                    // Update High Score
                    if (score > highScore) {
                        setHighScore(score);
                        localStorage.setItem('melora-parachute-highscore', score.toString());
                    }
                }

                // Collision with Bullets
                bulletsRef.current.forEach((b, bi) => {
                    if (
                        b.x < e.x + e.width &&
                        b.x + b.width > e.x &&
                        b.y < e.y + e.height &&
                        b.y + b.height > e.y
                    ) {
                        // HIT!
                        bulletsRef.current.splice(bi, 1);
                        enemiesRef.current.splice(i, 1);
                        setScore(prev => prev + 1);

                        // Explosion particles
                        for (let p = 0; p < 5; p++) {
                            particlesRef.current.push({
                                x: e.x, y: e.y, width: 2, height: 2, color: 'orange', type: 'particle', speed: Math.random() * 2
                            });
                        }
                    }
                });
            });

            // Draw Player (Cannon)
            ctx.fillStyle = playerRef.current.color;
            ctx.fillRect(playerRef.current.x, canvas.height - 20, playerRef.current.width, playerRef.current.height);
            // Turret
            ctx.fillStyle = playerRef.current.color;
            ctx.fillRect(playerRef.current.x + 8, canvas.height - 30, 4, 10);

            // Draw Bullets
            ctx.fillStyle = '#ffff00';
            bulletsRef.current.forEach(b => {
                ctx.fillRect(b.x, b.y, b.width, b.height);
            });

            // Draw Enemies (Paratroopers)
            ctx.fillStyle = '#ff0000';
            enemiesRef.current.forEach(e => {
                ctx.fillRect(e.x, e.y, e.width, e.height);
                // Parachute lines
                ctx.beginPath();
                ctx.moveTo(e.x, e.y);
                ctx.lineTo(e.x - 5, e.y - 10);
                ctx.lineTo(e.x + e.width + 5, e.y - 10);
                ctx.lineTo(e.x + e.width, e.y);
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                // Parachute Curve
                ctx.beginPath();
                ctx.arc(e.x + 10, e.y - 10, 15, Math.PI, 0);
                ctx.stroke();
            });

            // Draw UI
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Courier New"';
            ctx.textAlign = 'left';
            ctx.fillText(`SCORE: ${score}`, 5, 12);
            ctx.textAlign = 'right';
            ctx.fillText(`HI: ${highScore}`, canvas.width - 5, 12);

            frameIdRef.current = requestAnimationFrame(loop);
        };

        loop();

        return () => cancelAnimationFrame(frameIdRef.current);
    }, [isActive, gameOver, score]); // Dependencies for re-binding, ref usage handles mutable state

    return (
        <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden">
            <canvas ref={canvasRef} className="bg-zinc-900 border border-zinc-800 rounded-sm shadow-inner" />

            {/* Retro Scanline Overlay */}
            <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none"></div>

            {/* Mobile Touch Controls (Fallback) */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-between px-8 opacity-0">
                <div className="w-20 h-20 bg-white/10 rounded-full" onClick={() => onSelect?.()}></div>
            </div>
        </div>
    );
}
