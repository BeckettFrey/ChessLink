// File: src/middleware/rateLimiter/index.ts
import { RateLimiterMemory } from "rate-limiter-flexible";
import { RateLimitExceededException } from "./exceptions";
import { Socket } from "socket.io";

const rateLimiter = new RateLimiterMemory({
    points: Number(process.env.RATE_LIMIT) || 5,
    duration: Number(process.env.RATE_LIMIT_DURATION) || 1
});

/**
 * Socket.IO middleware to enforce rate limiting.
 * Attaches to io.use(rateLimitMiddleware)
 */
export async function rateLimitMiddleware(socket: Socket, next: (err?: Error) => void) {
    const clientIp = socket.handshake.address;

    try {
        await rateLimiter.consume(clientIp);
        next();
    } catch {
        console.warn(`Rate limit exceeded for IP: ${clientIp}`);
        next(new RateLimitExceededException());
    }
}

// Expose the exceptions for external use
export { RateLimitExceededException } from "./exceptions";



