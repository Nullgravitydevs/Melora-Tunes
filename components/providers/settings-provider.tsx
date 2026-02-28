"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { AudioQuality } from "@/lib/types";
import { loadSettings, saveSettings } from "@/lib/settings";
import { useEqualizer } from "@/hooks/useEqualizer";

export interface SettingsContextType {
    qualityPreference: AudioQuality;
    setQualityPreference: (q: AudioQuality) => void;
    sleepTimer: { endTime: number; duration: number } | null;
    setSleepTimer: (timer: { endTime: number; duration: number } | null) => void;
    crossfadeDuration: number;
    setCrossfadeDuration: (duration: number) => void;
    stopAtEndOfSong: boolean;
    setStopAtEndOfSong: (val: boolean) => void;
    notificationsEnabled: boolean;
    setNotificationsEnabled: (enabled: boolean) => void;
    playbackSpeed: number;
    setPlaybackSpeed: (speed: number) => void;
    eq: ReturnType<typeof useEqualizer>;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [qualityPreference, setQualityPreferenceState] = useState<AudioQuality>('320');
    const [sleepTimer, setSleepTimer] = useState<{ endTime: number; duration: number } | null>(null);
    const [crossfadeDuration, setCrossfadeDurationState] = useState(0);
    const [stopAtEndOfSong, setStopAtEndOfSongState] = useState(false);
    const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
    const [playbackSpeed, setPlaybackSpeedState] = useState(1);
    const eq = useEqualizer();

    const setQualityPreference = useCallback((newQualityPreference: AudioQuality) => {
        setQualityPreferenceState(newQualityPreference);
        saveSettings({ qualityPreference: newQualityPreference });
        window.dispatchEvent(new CustomEvent('melora-quality-changed', { detail: newQualityPreference }));
    }, []);

    const setCrossfadeDurationHandler = useCallback((duration: number) => {
        setCrossfadeDurationState(duration);
        saveSettings({ crossfadeDuration: duration });
    }, []);

    const setStopAtEndOfSongHandler = useCallback((val: boolean) => {
        setStopAtEndOfSongState(val);
        saveSettings({ stopAtEndOfSong: val });
    }, []);

    const setNotificationsEnabledHandler = useCallback((enabled: boolean) => {
        setNotificationsEnabledState(enabled);
        saveSettings({ notificationsEnabled: enabled });
    }, []);

    const setPlaybackSpeedHandler = useCallback((speed: number) => {
        setPlaybackSpeedState(speed);
        saveSettings({ playbackSpeed: speed });
    }, []);

    // Load initial settings
    useEffect(() => {
        const settings = loadSettings();
        if (settings?.qualityPreference) setQualityPreferenceState(settings.qualityPreference as AudioQuality);
        if (settings?.crossfadeDuration !== undefined) setCrossfadeDurationState(settings.crossfadeDuration);
        if (settings?.stopAtEndOfSong !== undefined) setStopAtEndOfSongState(settings.stopAtEndOfSong);
        if (settings?.notificationsEnabled !== undefined) setNotificationsEnabledState(settings.notificationsEnabled);
        if (settings?.playbackSpeed !== undefined) setPlaybackSpeedState(settings.playbackSpeed);
    }, []);

    const value = useMemo(() => ({
        qualityPreference, setQualityPreference,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDuration: setCrossfadeDurationHandler,
        stopAtEndOfSong, setStopAtEndOfSong: setStopAtEndOfSongHandler,
        notificationsEnabled, setNotificationsEnabled: setNotificationsEnabledHandler,
        playbackSpeed, setPlaybackSpeed: setPlaybackSpeedHandler,
        eq
    }), [
        qualityPreference, setQualityPreference,
        sleepTimer, setSleepTimer,
        crossfadeDuration, setCrossfadeDurationHandler,
        stopAtEndOfSong, setStopAtEndOfSongHandler,
        notificationsEnabled, setNotificationsEnabledHandler,
        playbackSpeed, setPlaybackSpeedHandler,
        eq
    ]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings must be used within a SettingsProvider");
    return context;
}
