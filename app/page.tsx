"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePlayback } from "@/components/providers/playback-context";

// --- THE TRINITY: 3 MODES ---
const ClassicMode = dynamic(() => import("@/components/android/AndroidEntry").then(mod => mod.AndroidEntry), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING CLASSIC..." />
});

const DiscoveryMode = dynamic(() => import("@/components/discovery/DiscoveryLayout").then(mod => mod.DiscoveryLayout), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DISCOVERY..." />
});

const DeckMode = dynamic(() => import("@/components/windows/scenes/stage").then(mod => mod.WindowsStage), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DECK..." />
});

import { SetupWizard } from "@/components/windows/scenes/setup-wizard";
import { Launcher } from "@/components/windows/scenes/launcher";

export type UIMode = 'CLASSIC' | 'DISCOVERY' | 'DECK' | 'WELCOME' | 'LAUNCHER';

export default function Home() {
  const isMobileSystem = useIsMobile();
  const [mode, setMode] = useState<UIMode | null>(null);
  const [mounted, setMounted] = useState(false);
  const { pause, setQueue, updateMix } = usePlayback();

  useEffect(() => {
    setMounted(true);

    // User Request: "When setup is done and user open normally app show this (Interface Chooser)"
    const isSetupDone = localStorage.getItem('melora-setup-complete') === 'true';

    if (isSetupDone) {
      setMode('LAUNCHER');
    } else {
      setMode('WELCOME');
    }
  }, [isMobileSystem]);

  // Function to Switch Modes (Passed down via Context or Props if needed, 
  // but usually components will just set localStorage and reload or we pass a callback)
  // For now, components can use:
  // window.dispatchEvent(new CustomEvent('melora-mode-change', { detail: 'DECK' }));
  // We listen for it here.

  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => {
      const newMode = e.detail as UIMode;
      if (['CLASSIC', 'DISCOVERY', 'DECK', 'WELCOME', 'LAUNCHER'].includes(newMode)) { // Updated valid modes
        // STOP LOOPHOLE: Switching modes resets the experience.
        pause();
        // Optional: Clear queue to force "Insert Tape" or "Select Song"
        // setQueue([]); 

        setMode(newMode);
        localStorage.setItem('melora-ui-mode', newMode);
      }
    };
    window.addEventListener('melora-mode-change', handleModeChange as any);
    return () => window.removeEventListener('melora-mode-change', handleModeChange as any);
  }, []);

  if (!mounted || !mode) return <SplashScreen text="INITIALIZING..." />;

  // Render ONE mode exclusively (Unmount others)
  return (
    <main className="w-full h-full bg-black overflow-hidden relative">
      <ErrorBoundary>
        <Suspense fallback={<SplashScreen text="LOADING..." />}>

          {mode === 'LAUNCHER' && (
            <Launcher
              onSelect={(selectedMode) => {
                setMode(selectedMode);
                localStorage.setItem('melora-ui-mode', selectedMode);
              }}
            />
          )}

          {mode === 'WELCOME' && (
            <SetupWizard
              onComplete={(selectedMode) => {
                localStorage.setItem('melora-setup-complete', 'true'); // Added setup complete flag
                setMode(selectedMode);
                localStorage.setItem('melora-ui-mode', selectedMode);
              }}
            />
          )}

          {mode === 'CLASSIC' && (
            <ClassicMode
              onSwitchToDesktop={(theme) => {
                // Classic -> Discovery/Deck Switcher
                const target = theme === 'GLASS' ? 'DISCOVERY' : 'DECK';
                setMode(target);
                localStorage.setItem('melora-ui-mode', target);
              }}
            />
          )}

          {mode === 'DISCOVERY' && (
            <DiscoveryMode />
            // Note: DiscoveryLayout handles internal Theme state.
            // We need a way to Switch to Deck/Classic from inside Discovery.
            // We will add a "Mode Switcher" UI later.
          )}

          {mode === 'DECK' && (
            <DeckMode
              onSwitchToMobile={() => {
                setMode('CLASSIC');
                localStorage.setItem('melora-ui-mode', 'CLASSIC');
              }}
            // Deck -> Discovery handled via Settings often
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}

function SplashScreen({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 bg-black text-zinc-500 flex items-center justify-center font-mono text-xs tracking-[0.2em] animate-pulse">
      {text}
    </div>
  );
}
