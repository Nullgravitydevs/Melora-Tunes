import { useState, useEffect } from 'react';

const STORAGE_KEY = 'melora-search-history';
const MAX_HISTORY = 12;

export function useSearchHistory() {
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load search history", e);
        }
    }, []);

    const addSearch = (term: string) => {
        if (!term || !term.trim()) return;
        const cleanTerm = term.trim();

        setHistory(prev => {
            // Remove if exists (to move to top), add to front, slice to max
            const filtered = prev.filter(t => t.toLowerCase() !== cleanTerm.toLowerCase());
            const updated = [cleanTerm, ...filtered].slice(0, MAX_HISTORY);
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error("Failed to save search history", e);
            }
            return updated;
        });
    };

    const removeSearch = (term: string) => {
        setHistory(prev => {
            const updated = prev.filter(t => t !== term);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    };

    return { history, addSearch, removeSearch, clearHistory };
}
