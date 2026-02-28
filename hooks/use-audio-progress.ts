import { useState, useEffect } from 'react';

export function useAudioProgress() {
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    useEffect(() => {
        const handleProgress = (e: CustomEvent) => {
            setProgress(e.detail.played);
            if (typeof e.detail.playedSeconds === 'number') {
                setCurrentTime(e.detail.playedSeconds);
            }
        };
        window.addEventListener('melora-audio-progress', handleProgress as EventListener);
        return () => window.removeEventListener('melora-audio-progress', handleProgress as EventListener);
    }, []);

    return { progress, currentTime };
}
