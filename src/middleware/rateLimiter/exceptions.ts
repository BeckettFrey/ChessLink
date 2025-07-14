/**
 * Custom exception for rate limit exceeded.
 */
export class RateLimitExceededException extends Error {
    constructor(message: string = "Rate limit exceeded") {
        super(message);
        this.name = "RateLimitExceededException";
        Object.setPrototypeOf(this, RateLimitExceededException.prototype);
    }
}