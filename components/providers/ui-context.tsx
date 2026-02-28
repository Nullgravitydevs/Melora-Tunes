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
            {
                toast && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-zinc-800/90 text-white text-xs font-bold rounded-full border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 transition-all pointer-events-none">
                        {toast.type === 'error' && <span className="text-red-400">⚠️</span>}
                        {toast.type === 'info' && <span className="text-amber-400">ℹ️</span>}
                        {toast.message}
                    </div>
                )
            }
        </UIContext.Provider>
    );
}

export function useUI() {
    const context = useContext(UIContext);
    if (!context) throw new Error("useUI must be used within a UIProvider");
    return context;
}
