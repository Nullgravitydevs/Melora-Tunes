"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const WindowsStage = dynamic(() => import("@/components/windows/scenes/stage").then(mod => mod.WindowsStage), { ssr: false });
const AndroidEntry = dynamic(() => import("@/components/android/AndroidEntry").then(mod => mod.AndroidEntry), { ssr: false });

export default function Home() {
  const isMobileSystem = useIsMobile();
  const [viewModeOverride, setViewModeOverride] = useState<'desktop' | 'mobile' | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset override on system change (rotation/resize)
  useEffect(() => {
    setViewModeOverride(null);
  }, [isMobileSystem]);

  if (!mounted) return null;

  const effectiveMode = viewModeOverride || (isMobileSystem ? 'mobile' : 'desktop');

  return (
    <main className="w-full h-full">
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">LOADING SYSTEM...</div>}>
          {effectiveMode === 'mobile' ? (
            <AndroidEntry onSwitchToDesktop={() => setViewModeOverride('desktop')} />
          ) : (
            <WindowsStage onSwitchToMobile={() => setViewModeOverride('mobile')} />
          )}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
