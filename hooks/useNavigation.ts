"use client";

import { useState, useCallback } from 'react';

type ViewType = 'home' | 'search' | 'playlist' | 'album' | 'artist' | 'queue' | 'library' | 'nowplaying' | 'explore' | 'history' | 'hifi';

interface ViewState {
    type: ViewType;
    data?: any;
}

interface UseNavigationReturn {
    viewStack: ViewState[];
    currentView: ViewState;
    navigateTo: (view: ViewState) => void;
    goBack: () => void;
    goHome: () => void;
    canGoBack: boolean;
}

/**
 * Shared navigation hook - manages view stack for all modes
 * Use this across Discovery, iPod, and Deck modes
 */
export function useNavigation(initialView: ViewState = { type: 'home' }): UseNavigationReturn {
    const [viewStack, setViewStack] = useState<ViewState[]>([initialView]);

    const currentView = viewStack[viewStack.length - 1];
    const canGoBack = viewStack.length > 1;

    const navigateTo = useCallback((view: ViewState) => {
        setViewStack(prev => [...prev, view]);
    }, []);

    const goBack = useCallback(() => {
        setViewStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
    }, []);

    const goHome = useCallback(() => {
        setViewStack([{ type: 'home' }]);
    }, []);

    return {
        viewStack,
        currentView,
        navigateTo,
        goBack,
        goHome,
        canGoBack
    };
}
