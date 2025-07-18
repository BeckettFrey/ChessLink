// File: src/services/cleaningService/types.ts
export interface TimestampedObject {
  updatedAt: number;
  [key: string]: any;
};

export interface CleaningServiceInterface {
  stopCleanup(): void;
}

export interface CleaningServiceConstructor {
  new (
    map: Map<string, TimestampedObject>,
    cleanupIntervalMs: number,
    staleThresholdMs: number,
    cleanupProtocol: (obj: TimestampedObject) => void
  ): CleaningServiceInterface;
}