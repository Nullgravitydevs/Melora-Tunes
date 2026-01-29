"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchUnified, SearchType } from '@/lib/unified-search';
import { PlayableTrack } from '@/lib/types';

interface UseSearchOptions {
    debounceMs?: number;
    initialFilter?: SearchType;
}

interface UseSearchReturn {
    query: string;
    setQuery: (q: string) => void;
    results: PlayableTrack[];
    isSearching: boolean;
    filter: SearchType;
    setFilter: (f: SearchType) => void;
    clearSearch: () => void;
}

/**
 * Shared search hook - handles debounced search with unified results
 * Use this across Discovery, iPod, and Deck modes
 */
export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
    const { debounceMs = 400, initialFilter = 'all' } = options;

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<PlayableTrack[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [filter, setFilter] = useState<SearchType>(initialFilter);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            return;
        }

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        setIsSearching(true);
        searchTimeout.current = setTimeout(async () => {
            try {
                const data = await searchUnified(query, filter);
                setResults(data);
            } catch (e) {
                console.error("Search error:", e);
            } finally {
                setIsSearching(false);
            }
        }, debounceMs);

        return () => {
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [query, filter, debounceMs]);

    const clearSearch = useCallback(() => {
        setQuery("");
        setResults([]);
    }, []);

    return {
        query,
        setQuery,
        results,
        isSearching,
        filter,
        setFilter,
        clearSearch
    };
}
