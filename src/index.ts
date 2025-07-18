// File: src/index.ts
// Main exports for the ChessLink library

// Socket handlers - primary entry point
export { registerChessSockets } from './sockets/chessSockets';

// Type definitions
export * from './types';

// Core game management
export { GameManager } from './gameManager';
export * from './gameManager/exceptions';
export * from './gameManager/types';

// Middleware components
export { rateLimitMiddleware } from './middleware/rateLimiter';
export * from './middleware/rateLimiter/exceptions';

export { sessionMiddleware } from './middleware/sessionStore';
export * from './middleware/sessionStore/exceptions';

// Background services
export { CleaningService } from './services/cleaningService';
export * from './services/cleaningService/exceptions';
export * from './services/cleaningService/types';