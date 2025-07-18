// File: src/services/cleaningService/index.ts
import { CleaningServiceInterface, TimestampedObject } from "./types";
import { CleanupException } from "./exceptions";
export * from "./types";
export * from "./exceptions";

export class CleaningService implements CleaningServiceInterface {
  private map: Map<string, TimestampedObject>;
  private staleThresholdMs: number;
  private cleanupIntervalMs: number;
  private cleanupTimer?: NodeJS.Timeout;
  private cleanupProtocol: (obj: TimestampedObject) => void;

  constructor(
    map: Map<string, TimestampedObject>, 
    cleanupIntervalMs: number, 
    staleThresholdMs: number, 
    cleanupProtocol: (obj: TimestampedObject) => void
  ) {
    this.map = map;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.staleThresholdMs = staleThresholdMs;
    if (!cleanupProtocol) {
      throw new Error('A cleanup protocol function must be provided');
    }
    this.cleanupProtocol = cleanupProtocol;
    if (cleanupIntervalMs > 0 && staleThresholdMs > 0) {
      this.monitorCleanup();
    } else {
      throw new Error('Invalid cleanup or stale threshold interval');
    }
  }

  private monitorCleanup() {
    try {
      const now = Date.now();
      for (const [_, obj] of Array.from(this.map.entries())) {
        if (obj.updatedAt + this.staleThresholdMs < now) {
          this.cleanupProtocol(obj);
        }
      }
    } catch (error) {
      throw new CleanupException('Error during cleanup: ' + (error as Error).message);
    }
    this.cleanupTimer = setTimeout(() => this.monitorCleanup(), this.cleanupIntervalMs);
  }

  stopCleanup() {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
    }
  }
}