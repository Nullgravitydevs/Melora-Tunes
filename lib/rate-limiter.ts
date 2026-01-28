/**
 * Smart Rate Limiter & Queue System
 * Prevents API Bans by enforcing strict request limits.
 */

type Task<T> = () => Promise<T>;

interface QueueItem<T> {
    task: Task<T>;
    resolve: (value: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
    timestamp: number;
}

export class RateLimiter {
    private queue: QueueItem<any>[] = [];
    private activeCount = 0;
    private lastRequestTime = 0;

    // Config
    private maxConcurrency: number;
    private minIntervalMs: number; // Time between requests
    private burstLimit: number; // Max requests in a burst window

    constructor(maxConcurrency = 2, minIntervalMs = 1500) {
        this.maxConcurrency = maxConcurrency;
        this.minIntervalMs = minIntervalMs;
        this.burstLimit = 2;
    }

    /**
     * Add a task to the queue
     */
    async add<T>(task: Task<T>, priority = false): Promise<T> {
        return new Promise((resolve, reject) => {
            const item: QueueItem<T> = { task, resolve, reject, timestamp: Date.now() };
            if (priority) {
                this.queue.unshift(item);
            } else {
                this.queue.push(item);
            }
            this.process();
        });
    }

    /**
     * Process the queue
     */
    private async process() {
        if (this.activeCount >= this.maxConcurrency) return;
        if (this.queue.length === 0) return;

        // Rate Limiting Check
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;

        if (timeSinceLast < this.minIntervalMs && this.activeCount > 0) {
            // Wait until interval passes
            const wait = this.minIntervalMs - timeSinceLast;
            setTimeout(() => this.process(), wait);
            return;
        }

        // Execute Next
        const item = this.queue.shift();
        if (!item) return;

        this.activeCount++;
        this.lastRequestTime = Date.now();

        try {
            // Run Task
            const result = await item.task();
            item.resolve(result);
        } catch (error) {
            item.reject(error);
        } finally {
            this.activeCount--;
            // Chain next
            this.process();
        }
    }

    /**
     * Clear pending requests (e.g., on navigation change)
     */
    clear() {
        this.queue = [];
    }
}

// Global Singleton for HiFi API
export const HiFiLimiter = new RateLimiter(2, 2000); // 1 request every 1s per concurrency slot (approx 2 req / 2s)
