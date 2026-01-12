"use client";

import { Suspense, useState, useEffect } from 'react';
import { Stage } from "@/components/scene/stage";
import { IPod } from "@/components/mobile/IPod";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function Home() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <main>
      <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-retro-black text-retro-white flex items-center justify-center font-mono">LOADING TAPES...</div>}>
          {isMobile ? <IPod /> : <Stage />}
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}
