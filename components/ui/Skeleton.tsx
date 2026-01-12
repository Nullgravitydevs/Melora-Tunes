"use client";

export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse ${className}`}>
            <div className="h-4 bg-zinc-700/50 rounded w-3/4 mb-2" />
            <div className="h-4 bg-zinc-700/50 rounded w-1/2 mb-2" />
            <div className="h-4 bg-zinc-700/50 rounded w-2/3" />
        </div>
    );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2 p-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-zinc-700/50 rounded animate-pulse" />
                    <div className="flex-1">
                        <div className="h-3 bg-zinc-700/50 rounded w-3/4 mb-1 animate-pulse" />
                        <div className="h-2 bg-zinc-700/50 rounded w-1/2 animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    );
}
