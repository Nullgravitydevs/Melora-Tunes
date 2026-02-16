"use client";

import { useEffect, useRef, useState } from "react";

interface VisualizerProps {
    isPlaying: boolean;
    className?: string;
    accentColor?: string;
}

type VisualizerMode = 'SPECTRUM' | 'SCOPE' | 'CIRCLE' | 'LED';

export function Visualizer({ isPlaying, className, accentColor = "#06b6d4" }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<VisualizerMode>('SPECTRUM');

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationId: number;
        let tick = 0;

        // State for Spectrum
        const barCount = 20;
        const bars: number[] = new Array(barCount).fill(0);
        const peaks: number[] = new Array(barCount).fill(0);

        const render = () => {
            tick++;
            const width = canvas.width;
            const height = canvas.height;

            ctx.clearRect(0, 0, width, height);

            // Background for contrast
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, width, height);

            if (mode === 'SPECTRUM') {
                const barWidth = width / barCount;
                const gap = 2;

                bars.forEach((currentHeight, i) => {
                    // Simulation Logic
                    let targetH = 0;
                    if (isPlaying) {
                        // Create some "dancing" randomness based on sine waves + noise
                        const noise = Math.random() * height * 0.5;
                        const wave = Math.sin(tick * 0.1 + i) * height * 0.3;
                        targetH = Math.max(5, Math.abs(wave + noise));
                    } else {
                        targetH = 2; // Resting state
                    }

                    // Smooth transition
                    bars[i] += (targetH - bars[i]) * 0.2;

                    // Peak logic
                    if (bars[i] > peaks[i]) {
                        peaks[i] = bars[i];
                    } else {
                        peaks[i] = Math.max(0, peaks[i] - 0.5); // Decay
                    }

                    const x = i * barWidth;

                    // Draw Bar
                    ctx.fillStyle = accentColor;
                    const h = bars[i];
                    ctx.fillRect(x + gap / 2, height - h, barWidth - gap, h);

                    // Draw Peak Cap
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(x + gap / 2, height - peaks[i] - 2, barWidth - gap, 2);
                });
            }
            else if (mode === 'LED') {
                // Segmented LED Bars
                const barWidth = width / barCount;
                const gap = 2;
                const segmentHeight = 4;
                const segmentGap = 1;

                bars.forEach((currentHeight, i) => {
                    // Simulation Logic (Reuse)
                    let targetH = 0;
                    if (isPlaying) {
                        const noise = Math.random() * height * 0.5;
                        const wave = Math.sin(tick * 0.15 + i) * height * 0.35;
                        targetH = Math.max(5, Math.abs(wave + noise));
                    } else {
                        targetH = 2;
                    }

                    bars[i] += (targetH - bars[i]) * 0.2;
                    if (bars[i] > peaks[i]) peaks[i] = bars[i];
                    else peaks[i] = Math.max(0, peaks[i] - 0.5);

                    const x = i * barWidth;
                    const h = bars[i];
                    const numSegments = Math.floor(h / (segmentHeight + segmentGap));

                    ctx.fillStyle = accentColor;
                    for (let j = 0; j < numSegments; j++) {
                        const y = height - ((j + 1) * (segmentHeight + segmentGap));
                        ctx.fillRect(x + gap / 2, y, barWidth - gap, segmentHeight);
                    }

                    // Peak (Single Segment)
                    ctx.fillStyle = "#ffffff";
                    const peakY = height - peaks[i];
                    ctx.fillRect(x + gap / 2, peakY, barWidth - gap, segmentHeight);
                });
            }
            else if (mode === 'SCOPE') {
                // Oscilloscope
                ctx.lineWidth = 2;
                ctx.strokeStyle = accentColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = accentColor;

                ctx.beginPath();
                for (let x = 0; x < width; x++) {
                    let y = height / 2;
                    if (isPlaying) {
                        // Complex wave: sum of sines
                        const f1 = Math.sin(x * 0.05 + tick * 0.2);
                        const f2 = Math.sin(x * 0.1 - tick * 0.1);
                        const f3 = Math.sin(x * 0.02 + tick * 0.05);
                        y += (f1 + f2 + f3) * (height * 0.15);
                    } else {
                        // Flatline with slight hum
                        y += Math.sin(x * 0.1 + tick * 0.1) * 2;
                    }

                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset
            }
            else if (mode === 'CIRCLE') {
                // Circular Spectrum
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.3;

                ctx.strokeStyle = accentColor;
                ctx.lineWidth = 2;
                ctx.beginPath();

                for (let i = 0; i <= 360; i += 5) {
                    const rad = (i * Math.PI) / 180;
                    let offset = 0;
                    if (isPlaying) {
                        const noise = Math.random() * 10;
                        const wave = Math.sin(tick * 0.1 + (i / 10)) * 10;
                        offset = Math.abs(wave + noise);
                    }

                    const r = radius + offset;
                    const x = centerX + Math.cos(rad) * r;
                    const y = centerY + Math.sin(rad) * r;

                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();

                // Inner pulse
                if (isPlaying) {
                    ctx.fillStyle = accentColor + '40'; // Low opacity
                    ctx.beginPath();
                    const pulse = radius * 0.8 + Math.sin(tick * 0.2) * 5;
                    ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (isPlaying) {
                animationId = requestAnimationFrame(render);
            } else {
                // Decay one last time then stop
                if (tick < 100) { // arbitrary decay frames
                    animationId = requestAnimationFrame(render);
                }
            }
        };

        if (isPlaying) {
            render();
        } else {
            // Draw once to show resting state
            render();
        }

        return () => cancelAnimationFrame(animationId);
    }, [isPlaying, mode, accentColor]);

    const cycleMode = () => {
        setMode(prev => {
            if (prev === 'SPECTRUM') return 'LED';
            if (prev === 'LED') return 'SCOPE';
            if (prev === 'SCOPE') return 'CIRCLE';
            return 'SPECTRUM';
        });
    };

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={100}
            className={`${className} cursor-pointer active:scale-95 transition-transform rounded border border-white/10 shadow-inner bg-black`}
            onClick={cycleMode}
            title={`Mode: ${mode} (Click to change)`}
        />
    );
}
