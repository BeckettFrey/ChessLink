// File: src/services/cleaningService/index.ts
import { CleanupException } from './exceptions';

type TimestampedObject = {
  updatedAt: number;
  [key: string]: any;
};

export class CleaningService {
  private map: Map<string, TimestampedObject>;
  private staleThresholdMs: number;
  private cleanupIntervalMs: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(map: Map<string, TimestampedObject>, cleanupIntervalMs: number, staleThresholdMs: number) {
    this.map = map;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.staleThresholdMs = staleThresholdMs;

    if (cleanupIntervalMs > 0 && staleThresholdMs > 0) {
      this.startCleanup();
    } else {
      throw new Error('Invalid cleanup or stale threshold interval');
    }
  }

  /**
   * Starts the periodic cleanup of stale state.
   */
  private startCleanup() {
    const runCleanup = () => {
      try {
        const now = Date.now();
        for (const [gameId, game] of Array.from(this.map.entries())) {
          if (game.updatedAt + this.staleThresholdMs < now) {
            this.map.delete(gameId);
          }
        }
        this.cleanupTimer = setTimeout(runCleanup, this.cleanupIntervalMs);
      } catch (error) {
        throw new CleanupException('Error during cleanup: ' + error.message);
      }
    };

    runCleanup();
  }

  /**
   * Stops the scheduled cleanup (for testing or shutdown)
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
  }
}
