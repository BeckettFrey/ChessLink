// File: src/gameManager/exceptions.ts
export class StateSyncError extends Error {
    constructor(message?: string) {
        super(message || 'State synchronization error');
        this.name = 'StateSyncError';
        Object.setPrototypeOf(this, StateSyncError.prototype);
    }
}