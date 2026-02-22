import { useState, useEffect } from 'react';

export function useAudioProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleProgress = (e: CustomEvent) => setProgress(e.detail.played);
        window.addEventListener('melora-audio-progress', handleProgress as EventListener);
        return () => window.removeEventListener('melora-audio-progress', handleProgress as EventListener);
    }, []);

    return { progress };
}
