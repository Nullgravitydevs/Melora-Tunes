"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayback } from "@/components/providers/playback-context";

interface VisualizerProps {
    isPlaying: boolean;
    className?: string;
    accentColor?: string;
}

type VisualizerMode = 'SPECTRUM' | 'SCOPE' | 'CIRCLE' | 'LED';

export function Visualizer({ isPlaying, className, accentColor = "#06b6d4" }: VisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mode, setMode] = useState<VisualizerMode>('SPECTRUM');
    const { getAnalyser } = usePlayback();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const analyser = getAnalyser();
        const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
        const timeDataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

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
                if (analyser && dataArray) analyser.getByteFrequencyData(dataArray);

                const barWidth = width / barCount;
                const gap = 2;

                bars.forEach((currentHeight, i) => {
                    let targetH = 0;
                    if (isPlaying) {
                        if (analyser && dataArray) {
                            // Map 20 bars to the 128 bins (roughly 6 bins per bar)
                            const binSize = Math.floor(dataArray.length / barCount);
                            const start = i * binSize;
                            let sum = 0;
                            for (let b = 0; b < binSize; b++) sum += dataArray[start + b];
                            const avg = sum / binSize;
                            // Scale 0-255 to canvas height
                            targetH = Math.max(2, (avg / 255) * height);
                        } else {
                            // Keep it flat if no visualizer data is available yet
                            targetH = 2;
                        }
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
                if (analyser && dataArray) analyser.getByteFrequencyData(dataArray);

                // Segmented LED Bars
                const barWidth = width / barCount;
                const gap = 2;
                const segmentHeight = 4;
                const segmentGap = 1;

                bars.forEach((currentHeight, i) => {
                    let targetH = 0;
                    if (isPlaying) {
                        if (analyser && dataArray) {
                            const binSize = Math.floor(dataArray.length / barCount);
                            const start = i * binSize;
                            let sum = 0;
                            for (let b = 0; b < binSize; b++) sum += dataArray[start + b];
                            const avg = sum / binSize;
                            targetH = Math.max(2, (avg / 255) * height);
                        } else {
                            targetH = 2;
                        }
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
                if (analyser && timeDataArray) analyser.getByteTimeDomainData(timeDataArray);

                // Oscilloscope
                ctx.lineWidth = 2;
                ctx.strokeStyle = accentColor;
                ctx.shadowBlur = 10;
                ctx.shadowColor = accentColor;

                ctx.beginPath();
                for (let x = 0; x < width; x++) {
                    let y = height / 2;
                    if (isPlaying) {
                        if (analyser && timeDataArray) {
                            // Map canvas width to dataArray length
                            const index = Math.floor((x / width) * timeDataArray.length);
                            const val = timeDataArray[index]; // 0-255
                            const percent = (val / 128) - 1; // -1 to 1
                            y += percent * (height / 2);
                        } else {
                            y += Math.sin(x * 0.1 + tick * 0.1) * 2;
                        }
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
                if (analyser && dataArray) analyser.getByteFrequencyData(dataArray);

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
                        if (analyser && dataArray) {
                            // map 360 degrees to frequency bins
                            const binIndex = Math.floor((i / 360) * (dataArray.length / 2)); // Use lower half of frequencies (bass/mids)
                            const val = dataArray[binIndex];
                            offset = (val / 255) * (radius * 0.5); // Max extrude is 50% of radius
                        } else {
                            offset = 0;
                        }
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

                    let pulseStr = 5;
                    if (analyser && dataArray) {
                        // Bass is usually in the first few bins
                        const bassSum = dataArray.slice(0, 4).reduce((a, b) => a + b, 0);
                        pulseStr = (bassSum / (4 * 255)) * 10; // 0-10px extra radius based on bass
                    }

                    const pulse = radius * 0.8 + Math.sin(tick * 0.2) * 5 + pulseStr;
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
