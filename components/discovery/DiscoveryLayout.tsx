"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DesktopDiscovery } from "./DesktopDiscovery";
import { MobileDiscovery } from "./MobileDiscovery";

// Theme Type Export
export type DiscoveryTheme = 'polar' | 'midnight' | 'crystal';

export function DiscoveryLayout() {
    const [isMobile, setIsMobile] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        return window.innerWidth < 768;
    });

    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<DiscoveryTheme>('midnight');

    // ✅ Stable resize handler
    const checkMobile = useCallback(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    useEffect(() => {
        setMounted(true);

        const saved = localStorage.getItem('melora-discovery-theme') as DiscoveryTheme | null;
        if (saved) setTheme(saved);

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, [checkMobile]);

    // ✅ Stable theme setter
    const toggleTheme = useCallback((newTheme: DiscoveryTheme) => {
        setTheme(newTheme);
        localStorage.setItem('melora-discovery-theme', newTheme);
    }, []);

    if (!mounted) return null;

    return isMobile
        ? <MobileDiscovery />
        : <DesktopDiscovery theme={theme} onThemeChange={toggleTheme} />;
}
