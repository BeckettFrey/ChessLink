// File: src/services/cleaningService/__tests__/index.test.ts
import { CleaningService } from '../index';
import { CleanupException } from '../exceptions';

// Mock object that only contains the updatedAt field
interface MockGame {
  updatedAt: number;
}

describe('CleaningService', () => {
  let mockMap: Map<string, MockGame>;
  let cleaningService: CleaningService;

  beforeEach(() => {
    mockMap = new Map<string, MockGame>();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    if (cleaningService) {
      cleaningService.stopCleanup();
    }
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should create CleaningService with valid parameters', () => {
      expect(() => {
        cleaningService = new CleaningService(mockMap, 1000, 5000);
      }).not.toThrow();
    });

    it('should throw error with invalid cleanup interval', () => {
      expect(() => {
        cleaningService = new CleaningService(mockMap, 0, 5000);
      }).toThrow('Invalid cleanup or stale threshold interval');
    });

    it('should throw error with invalid stale threshold', () => {
      expect(() => {
        cleaningService = new CleaningService(mockMap, 1000, 0);
      }).toThrow('Invalid cleanup or stale threshold interval');
    });

    it('should throw error with negative cleanup interval', () => {
      expect(() => {
        cleaningService = new CleaningService(mockMap, -1000, 5000);
      }).toThrow('Invalid cleanup or stale threshold interval');
    });

    it('should throw error with negative stale threshold', () => {
      expect(() => {
        cleaningService = new CleaningService(mockMap, 1000, -5000);
      }).toThrow('Invalid cleanup or stale threshold interval');
    });
  });

  describe('cleanup functionality', () => {
    beforeEach(() => {
      // Mock Date.now to return a consistent timestamp
      jest.spyOn(Date, 'now').mockReturnValue(10000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should not remove fresh games', () => {
      // Add a fresh game (updated 1 second ago)
      mockMap.set('game1', { updatedAt: 9000 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run the cleanup immediately
      jest.advanceTimersByTime(0);
      
      expect(mockMap.has('game1')).toBe(true);
      expect(mockMap.size).toBe(1);
    });

    it('should remove stale games', () => {
      // Add a stale game (updated 6 seconds ago, threshold is 5 seconds)
      mockMap.set('game1', { updatedAt: 4000 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run the cleanup immediately
      jest.advanceTimersByTime(0);
      
      expect(mockMap.has('game1')).toBe(false);
      expect(mockMap.size).toBe(0);
    });

    it('should handle mixed fresh and stale games', () => {
      // Add fresh game
      mockMap.set('fresh-game', { updatedAt: 8000 });
      // Add stale game
      mockMap.set('stale-game', { updatedAt: 3000 });
      // Add another fresh game
      mockMap.set('another-fresh', { updatedAt: 9500 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run the cleanup immediately
      jest.advanceTimersByTime(0);
      
      expect(mockMap.has('fresh-game')).toBe(true);
      expect(mockMap.has('stale-game')).toBe(false);
      expect(mockMap.has('another-fresh')).toBe(true);
      expect(mockMap.size).toBe(2);
    });

    it('should handle edge case where updatedAt exactly equals threshold', () => {
      // Game updated exactly at the threshold time
      mockMap.set('edge-game', { updatedAt: 5000 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run the cleanup immediately
      jest.advanceTimersByTime(0);
      
      // Should be removed because condition is updatedAt + threshold < now
      // 5000 + 5000 = 10000, which is NOT < 10000
      expect(mockMap.has('edge-game')).toBe(true);
    });

    it('should handle edge case where updatedAt is just past threshold', () => {
      // Game updated just past the threshold
      mockMap.set('edge-game', { updatedAt: 4999 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run the cleanup immediately
      jest.advanceTimersByTime(0);
      
      // Should be removed because 4999 + 5000 = 9999 < 10000
      expect(mockMap.has('edge-game')).toBe(false);
    });

    it('should run cleanup periodically', () => {
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Add a fresh game initially
      mockMap.set('game1', { updatedAt: 9000 });
      
      // First cleanup - game should remain
      jest.advanceTimersByTime(0);
      expect(mockMap.has('game1')).toBe(true);
      
      // Advance time but not enough to make the game stale
      jest.advanceTimersByTime(1000);
      expect(mockMap.has('game1')).toBe(true);
      
      // Mock time advancing to make the game stale
      jest.spyOn(Date, 'now').mockReturnValue(15000);
      
      // Advance timers to trigger next cleanup
      jest.advanceTimersByTime(1000);
      expect(mockMap.has('game1')).toBe(false);
    });

    it('should handle empty map', () => {
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run cleanup on empty map
      jest.advanceTimersByTime(0);
      
      expect(mockMap.size).toBe(0);
    });

    it('should handle map with multiple games of same staleness', () => {
      // Add multiple stale games
      mockMap.set('stale1', { updatedAt: 3000 });
      mockMap.set('stale2', { updatedAt: 2000 });
      mockMap.set('stale3', { updatedAt: 1000 });
      
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Run cleanup
      jest.advanceTimersByTime(0);
      
      expect(mockMap.size).toBe(0);
    });
  });

  describe('stopCleanup', () => {
    it('should stop the cleanup timer', () => {
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      // Add a game that will become stale
      mockMap.set('game1', { updatedAt: 4000 });
      
      // Stop cleanup before it runs
      cleaningService.stopCleanup();
      
      // Mock time advancing to make the game stale
      jest.spyOn(Date, 'now').mockReturnValue(15000);
      
      // Advance timers - cleanup should not run
      jest.advanceTimersByTime(2000);
      
      // Game should still be there because cleanup was stopped
      expect(mockMap.has('game1')).toBe(true);
    });

    it('should handle multiple calls to stopCleanup', () => {
      cleaningService = new CleaningService(mockMap, 1000, 5000);
      
      expect(() => {
        cleaningService.stopCleanup();
        cleaningService.stopCleanup();
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw CleanupException when cleanup fails', () => {
      // Mock Map.prototype.entries to throw an error
      const originalEntries = Map.prototype.entries;
      Map.prototype.entries = jest.fn().mockImplementation(() => {
        throw new Error('Map entries failed');
      });
      
      expect(() => {
        cleaningService = new CleaningService(mockMap, 1000, 5000);
        // Run cleanup immediately to trigger the error
        jest.advanceTimersByTime(0);
      }).toThrow(CleanupException);
      
      // Restore original method
      Map.prototype.entries = originalEntries;
    });

    it('should handle cleanup exception with proper error message', () => {
      const originalEntries = Map.prototype.entries;
      Map.prototype.entries = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      try {
        cleaningService = new CleaningService(mockMap, 1000, 5000);
        jest.advanceTimersByTime(0);
      } catch (error) {
        expect(error).toBeInstanceOf(CleanupException);
        expect(error.message).toBe('Error during cleanup: Test error');
      }
      
      Map.prototype.entries = originalEntries;
    });
  });
});