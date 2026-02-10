import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory rate limiter for API routes.
 * Uses a sliding window per IP address.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 120; // 120 requests per minute per IP

export function getClientIP(request: NextRequest | Request): string {
    if ('headers' in request) {
        return (
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            'unknown'
        );
    }
    return 'unknown';
}

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
    }

    entry.count++;

    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

export function rateLimitResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
    );
}

/**
 * Apply rate limiting to an API route handler.
 * Returns null if allowed, or a 429 response if rate limited.
 */
export function applyRateLimit(request: NextRequest | Request): NextResponse | null {
    const ip = getClientIP(request);
    const { allowed } = checkRateLimit(ip);

    if (!allowed) {
        return rateLimitResponse();
    }

    return null;
}

/**
 * Sanitize a string parameter — remove control characters, limit length.
 */
export function sanitizeParam(value: string | null, maxLength: number = 500): string | null {
    if (!value) return null;
    // Strip control characters
    const cleaned = value.replace(/[\x00-\x1F\x7F]/g, '').trim();
    return cleaned.slice(0, maxLength);
}

/**
 * Validate that a string is a reasonable numeric value.
 */
export function isNumericParam(value: string | null): boolean {
    if (!value) return false;
    return /^\d+$/.test(value);
}

/**
 * Add standard security headers to a response.
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    return response;
}

// Periodic cleanup of stale rate limit entries (every 5 minutes)
if (typeof globalThis !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of rateLimitMap) {
            if (now > entry.resetAt) {
                rateLimitMap.delete(ip);
            }
        }
    }, 5 * 60_000);
}
