"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { usePlayback } from "@/components/providers/playback-context";

// --- THE TRINITY: 3 MODES ---
const ClassicMode = dynamic(() => import("@/components/mobile/classic/AndroidEntry").then(mod => mod.AndroidEntry), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING CLASSIC..." />
});

const DiscoveryMode = dynamic(() => import("@/components/desktop/discovery/DiscoveryLayout").then(mod => mod.DiscoveryLayout), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DISCOVERY..." />
});

const MobileDiscoveryMode = dynamic(() => import("@/components/mobile/discovery/DiscoveryEntry").then(mod => mod.DiscoveryEntry), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DISCOVERY..." />
});

import { SetupWizard } from "@/components/shared/SetupWizard";

export type UIMode = 'CLASSIC' | 'DISCOVERY' | 'WELCOME';

export default function Home() {
  const isMobileSystem = useIsMobile();
  const [mode, setMode] = useState<UIMode | null>(null);
  const [mounted, setMounted] = useState(false);
  const { pause } = usePlayback();

  useEffect(() => {
    setMounted(true);

    const isSetupDone = localStorage.getItem('melora-setup-complete') === 'true';

    if (isSetupDone) {
      // Default to Discovery if setup is done (pure mobile/music app behavior)
      const savedMode = localStorage.getItem('melora-ui-mode') as UIMode;
      if (savedMode === 'CLASSIC' || savedMode === 'DISCOVERY') {
        setMode(savedMode);
      } else {
        setMode('DISCOVERY');
      }
    } else {
      setMode('WELCOME');
    }
  }, [isMobileSystem]);

  useEffect(() => {
    const handleModeChange = (e: CustomEvent) => {
      const newMode = e.detail as UIMode;
      if (['CLASSIC', 'DISCOVERY', 'WELCOME'].includes(newMode)) {
        pause();
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

          {mode === 'WELCOME' && (
            <SetupWizard
              onComplete={(selectedMode) => {
                localStorage.setItem('melora-setup-complete', 'true');
                // Setup wizard might still try to return 'DECK', force 'DISCOVERY'
                const finalMode = selectedMode === 'DECK' as any ? 'DISCOVERY' : selectedMode as UIMode;
                setMode(finalMode);
                localStorage.setItem('melora-ui-mode', finalMode);
              }}
            />
          )}

          {mode === 'CLASSIC' && (
            <ClassicMode
              onSwitchToDesktop={() => {
                setMode('DISCOVERY');
                localStorage.setItem('melora-ui-mode', 'DISCOVERY');
              }}
            />
          )}

          {mode === 'DISCOVERY' && (
            isMobileSystem ? <MobileDiscoveryMode /> : <DiscoveryMode />
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
