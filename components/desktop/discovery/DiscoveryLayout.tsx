"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { DesktopDiscovery } from "./DesktopDiscovery";
import { DiscoveryEntry as MobileDiscovery } from "@/components/mobile/discovery/DiscoveryEntry";

// --- TYPES ---
export type DiscoveryTheme = 'polar' | 'midnight' | 'crystal';

interface ThemeContextType {
    theme: DiscoveryTheme;
    setTheme: (t: DiscoveryTheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'midnight',
    setTheme: () => { }
});

export const useDiscoveryTheme = () => useContext(ThemeContext);

// --- THEME CONFIG ---
const THEMES: Record<DiscoveryTheme, React.CSSProperties> = {
    midnight: {
        '--disc-bg': '#000000',
        '--disc-surface': '#000000',
        '--disc-text': '#ffffff',
        '--disc-text-muted': '#a3a3a3',
        '--disc-accent': '#ffffff',
        '--disc-border': 'rgba(255,255,255,0.08)'
    } as React.CSSProperties,
    polar: {
        '--disc-bg': '#ffffff',
        '--disc-surface': '#f3f4f6',
        '--disc-text': '#000000',
        '--disc-text-muted': '#6b7280',
        '--disc-accent': '#000000',
        '--disc-border': 'rgba(0,0,0,0.08)'
    } as React.CSSProperties,
    crystal: {
        '--disc-bg': '#0f172a',
        '--disc-surface': '#1e293b',
        '--disc-text': '#f8fafc',
        '--disc-text-muted': '#94a3b8',
        '--disc-accent': '#38bdf8',
        '--disc-border': 'rgba(56,189,248,0.1)'
    } as React.CSSProperties
};

// --- LAYOUT ---
export function DiscoveryLayout() {
    // 1. Theme State (Persisted)
    const [theme, setThemeState] = useState<DiscoveryTheme>('midnight');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem('melora-discovery-theme') as DiscoveryTheme;
        if (saved && THEMES[saved]) setThemeState(saved);
        else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            // Optional: Auto-detect? defaulting to midnight for premium feel usually
        }
    }, []);

    const toggleTheme = useCallback((newTheme: DiscoveryTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('melora-discovery-theme', newTheme);
    }, []);

    // 2. CSS Variables Injection
    const styleVariables = THEMES[theme];

    // 3. Render
    // Note: We render BOTH Desktop and Mobile to preserve state, 
    // simply toggling visibility with CSS. 
    // This removes the unmonunt/remount flicker and state loss.

    if (!mounted) return <div className="bg-black h-screen w-screen" />; // Prevent hydration mismatch

    return (
        <ThemeContext.Provider value={{ theme, setTheme: toggleTheme }}>
            <div
                className="w-full h-full relative transition-colors duration-500 ease-in-out"
                style={styleVariables}
            >
                {/* Desktop View (Hidden on Mobile) */}
                <div className="hidden md:block w-full h-full">
                    <DesktopDiscovery theme={theme} onThemeChange={toggleTheme} />
                </div>

                {/* Mobile View (Hidden on Desktop) */}
                <div className="block md:hidden w-full h-full">
                    <MobileDiscovery />
                </div>
            </div>
        </ThemeContext.Provider>
    );
}
