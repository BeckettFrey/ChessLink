import { Socket } from "socket.io";
import { MissingUserIdException } from "./exceptions";

/**
 * Simple session middleware for Socket.IO.
 * Expects a userId in the socket handshake auth data.
 * Attaches userId to socket.data for later use.
 */
export function sessionMiddleware(socket: Socket, next: (err?: Error) => void) {
    const userId = socket.handshake.auth?.userId;
    if (!userId) {
        return next(new MissingUserIdException());
    }
    socket.data.userId = userId;
    next();
}

// Expose the exceptions for external use
export { MissingUserIdException } from "./exceptions";
