"use client";

import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
    audioElement: HTMLAudioElement | null;
    isPlaying: boolean;
    compact?: boolean;
}

export function AudioVisualizer({ audioElement, isPlaying, compact = false }: AudioVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>();
    const analyzerRef = useRef<AnalyserNode>();
    const audioContextRef = useRef<AudioContext>();

    useEffect(() => {
        if (!audioElement || !canvasRef.current) return;

        // Create audio context and analyzer
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyzerRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaElementSource(audioElement);
            source.connect(analyzerRef.current);
            analyzerRef.current.connect(audioContextRef.current.destination);
        }

        const analyzer = analyzerRef.current!;
        analyzer.fftSize = compact ? 64 : 128;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;

        const draw = () => {
            if (!isPlaying) {
                // Draw static bars when paused
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const barCount = compact ? 8 : 16;
                const barWidth = canvas.width / barCount;
                const minHeight = 2;

                for (let i = 0; i < barCount; i++) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fillRect(i * barWidth + 1, canvas.height - minHeight, barWidth - 2, minHeight);
                }
                return;
            }

            analyzer.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barCount = compact ? 8 : 16;
            const barWidth = canvas.width / barCount;
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step];
                const percent = value / 255;
                const height = Math.max(2, percent * canvas.height);

                // iPod-style gradient bars
                const gradient = ctx.createLinearGradient(0, canvas.height - height, 0, canvas.height);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

                ctx.fillStyle = gradient;
                ctx.fillRect(
                    i * barWidth + 1,
                    canvas.height - height,
                    barWidth - 2,
                    height
                );
            }

            animationRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [audioElement, isPlaying, compact]);

    return (
        <canvas
            ref={canvasRef}
            width={compact ? 120 : 240}
            height={compact ? 24 : 48}
            className="rounded"
        />
    );
}
