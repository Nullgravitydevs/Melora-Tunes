"use client";

import { useRef, TouchEvent } from 'react';
import { usePlayback } from '@/components/providers/playback-context';

export function usePlayerGestures() {
    const { next, prev, setVolume, volume } = usePlayback();
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const handlers = {
        onTouchStart: (e: TouchEvent) => {
            const touch = e.touches[0];
            touchStart.current = { x: touch.clientX, y: touch.clientY };
        },

        onTouchEnd: (e: TouchEvent) => {
            if (!touchStart.current) return;

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchStart.current.x;
            const deltaY = touch.clientY - touchStart.current.y;

            // Determine swipe direction (30px threshold)
            const threshold = 30;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal swipe
                if (Math.abs(deltaX) > threshold) {
                    if (deltaX > 0) {
                        prev(); // Swipe right = prev
                    } else {
                        next(); // Swipe left = next
                    }
                }
            } else {
                // Vertical swipe
                if (Math.abs(deltaY) > threshold) {
                    if (deltaY > 0) {
                        setVolume(Math.max(0, volume - 0.1)); // Swipe down = volume down
                    } else {
                        setVolume(Math.min(1, volume + 0.1)); // Swipe up = volume up
                    }
                }
            }

            touchStart.current = null;
        }
    };

    return handlers;
}
