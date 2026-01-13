"use client";

import { useState, useEffect } from 'react';

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const userAgent = window.navigator.userAgent;
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            // iPadOS 13+ often reports as Macintosh with maxTouchPoints > 1
            const isIPad = (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

            // User Request: If Landscape, show Studio UI (Desktop Mode)
            // If Portrait, show iPod UI (Mobile Mode)
            const isLandscape = window.innerWidth > window.innerHeight;

            if (isLandscape) {
                // Force Desktop UI in Landscape
                setIsMobile(false);
            } else {
                // Standard Mobile Check in Portrait
                setIsMobile(window.innerWidth < 1024 || isMobileUA || isIPad);
            }
        };

        // Initial check
        checkMobile();

        // Listen for resize
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}
