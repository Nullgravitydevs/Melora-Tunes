"use client";

import React, { useState, useEffect } from "react";
import { DesktopDiscovery } from "./DesktopDiscovery";
import { MobileDiscovery } from "./MobileDiscovery";

// Theme Type Export
export type DiscoveryTheme = 'polar' | 'midnight' | 'crystal';

export function DiscoveryLayout() {
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<DiscoveryTheme>('midnight');

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('melora-discovery-theme') as DiscoveryTheme;
        if (saved) setTheme(saved);

        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const toggleTheme = (newTheme: DiscoveryTheme) => {
        setTheme(newTheme);
        localStorage.setItem('melora-discovery-theme', newTheme);
    };

    if (!mounted) return null;

    return isMobile
        ? <MobileDiscovery />
        : <DesktopDiscovery theme={theme} onThemeChange={toggleTheme} />;
}
