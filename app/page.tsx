"use client";

import { Suspense, useState, useEffect } from 'react';
import { Stage } from "@/components/scene/stage";
import { IPod } from "@/components/mobile/IPod";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function Home() {
  const isMobileSystem = useIsMobile();
  const [viewModeOverride, setViewModeOverride] = useState<'desktop' | 'mobile' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // UseEffect to reset override when system state changes (e.g. rotation)
  // This ensures that if the user rotates their device, the UI adapts naturally,
  // unless they specifically want to force a mode, but rotation usually implies intent to switch view.
  useEffect(() => {
    setViewModeOverride(null);
  }, [isMobileSystem]);

  if (!mounted) return null; // Prevent hydration mismatch

  const effectiveMode = viewModeOverride || (isMobileSystem ? 'mobile' : 'desktop');

  return (
    <main>
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-retro-black text-retro-white flex items-center justify-center font-mono">LOADING TAPES...</div>}>
          {effectiveMode === 'mobile' ? (
            <IPod onSwitchToDesktop={() => setViewModeOverride('desktop')} />
          ) : (
            <Stage onSwitchToMobile={() => setViewModeOverride('mobile')} />
          )}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
