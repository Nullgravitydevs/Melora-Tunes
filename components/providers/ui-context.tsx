"use client";

import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";

interface ToastState {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface UIContextType {
    toast: ToastState | null;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    // We can also move some active quality badging or generic modals here if needed later
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<ToastState | null>(null);
    const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast({ id: Date.now(), message, type });
        toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        };
    }, []);

    const value = useMemo(() => ({
        toast, showToast
    }), [toast, showToast]);

    return (
        <UIContext.Provider value={value}>
            {children}
            {/* The global toast UI renderer is in glass-stage or similar, but we could add it here if it was global */}
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within a UIProvider");
    return context;
}
