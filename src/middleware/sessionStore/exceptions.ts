// File: src/middleware/sessionStore/exceptions.ts
/**
 * Custom exception for missing userId in session.
 * (requires userId to be present in socket handshake auth data)
 */
export class MissingUserIdException extends Error {
    constructor(message: string = "Authentication error: userId missing") {
        super(message);
        this.name = "MissingUserIdException";
        Object.setPrototypeOf(this, MissingUserIdException.prototype);
    }
}