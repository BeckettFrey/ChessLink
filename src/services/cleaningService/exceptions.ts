// File: src/services/cleaningService/exceptions.ts
export class CleanupException extends Error {
    constructor(message?: string) {
        super(message || 'An error occurred during cleanup.');
        this.name = 'CleanupException';
        Object.setPrototypeOf(this, CleanupException.prototype);
    }
}