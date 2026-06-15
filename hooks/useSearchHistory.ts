import { useState, useEffect } from "react";

const HISTORY_KEY = "melora_search_history";
const MAX_HISTORY = 10;

export function useSearchHistory() {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(HISTORY_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch { }
    }, []);

    const addSearch = (term: string) => {
        if (!term.trim()) return;
        const normalized = term.trim().toLowerCase();
        
        setHistory(prev => {
            // Remove if exists to move to top
            const filtered = prev.filter(t => t.toLowerCase() !== normalized);
            const updated = [term.trim(), ...filtered].slice(0, MAX_HISTORY);
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            } catch { }
            return updated;
        });
    };

    const removeSearch = (term: string) => {
        setHistory(prev => {
            const updated = prev.filter(t => t !== term);
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
            } catch { }
            return updated;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        try {
            localStorage.removeItem(HISTORY_KEY);
        } catch { }
    };

    return { history, addSearch, removeSearch, clearHistory };
}
