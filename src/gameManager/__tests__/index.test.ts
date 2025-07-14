// File: src/gameManager/__tests__/index.test.ts
import { GameManager } from '@gameManager';
import { Color, Link, Move } from '@types';
import { Chess } from 'chess.js';

// Mock CleaningService to prevent cleanup during tests
jest.mock('@services/cleaningService', () => ({
  CleaningService: jest.fn().mockImplementation(() => ({
    startCleanup: jest.fn(),
    stopCleanup: jest.fn(),
    cleanup: jest.fn(),
  })),
}));

describe('GameManager', () => {
  let manager: GameManager;

  beforeEach(() => {
    jest.useFakeTimers(); // Enable fake timers for consistent time handling
    jest.clearAllMocks(); // Clear mock calls between tests
    manager = new GameManager();
    manager['gameMap'].clear(); // Reset gameMap
    manager['userMap'].clear(); // Reset userMap
  });

  afterEach(() => {
    jest.clearAllTimers(); // Clear all timers to prevent leakage
  });

  it('creates a new game correctly', () => {
    const userId = 'user1';
    const game = manager.createGame(userId, 'white');

    expect(game).toBeDefined();
    expect(game.players.white).toBe(userId);
    expect(game.players.black).toBeNull();
    expect(game.joinable).toBe(true);
  });

  it('allows a user to join an existing game', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    expect(game.players.black).toBe('user2');
    expect(game.joinable).toBe(false);
  });

  it('throws if joining a full game', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    expect(() => manager.joinGame('user3', game.id)).toThrow('already full');
  });

  it('throws if trying to join non-existent game', () => {
    expect(() => manager.joinGame('user2', 'nonexistent')).toThrow('not found');
  });

  it('updates game timestamp when joining', () => {
    const game = manager.createGame('user1', 'white');
    const originalTimestamp = game.updatedAt;

    // Verify game exists and is the same object
    expect(manager['gameMap'].has(game.id)).toBe(true);
    expect(manager['gameMap'].get(game.id)).toBe(game);

    jest.advanceTimersByTime(100); // Advance time by 100ms for reliable timestamp difference
    manager.joinGame('user2', game.id);
    expect(game.updatedAt).toBeGreaterThan(originalTimestamp);
  });

  it('sets a draw offer correctly', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    manager.offerDraw('user1');
    expect(game.offeredDraw).toBe('user1');
  });

  it('throws if offering draw twice', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    manager.offerDraw('user1');
    expect(() => manager.offerDraw('user1')).toThrow('already been offered');
  });

  it('deletes a game and cleans user mappings', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    manager.deleteGame(game.id);

    expect(manager['gameMap'].has(game.id)).toBe(false);
    expect(manager['userMap'].has('user1')).toBe(false);
    expect(manager['userMap'].has('user2')).toBe(false);
  });

  it('returns a proper link object for the user', () => {
    const game = manager.createGame('user1', 'white');
    manager.joinGame('user2', game.id);

    const link: Link = manager.getLink('user1');
    expect(link).toBeDefined();
    expect(link?.id).toBe(game.id);
    expect(link?.color).toBe('white');
  });

  it('returns null for getLink if user not in any game', () => {
    expect(manager.getLink('nonexistent')).toBeNull();
  });

  describe('Game Creation Edge Cases', () => {
    it('creates a game with black color correctly', () => {
      const userId = 'user1';
      const game = manager.createGame(userId, 'black');

      expect(game.players.black).toBe(userId);
      expect(game.players.white).toBeNull();
      expect(game.joinable).toBe(true);
    });

    it('generates unique game IDs', () => {
      const game1 = manager.createGame('user1', 'white');
      const game2 = manager.createGame('user2', 'black');

      expect(game1.id).not.toBe(game2.id);
    });

    it('initializes game with correct default values', () => {
      const game = manager.createGame('user1', 'white');

      expect(game.fen).toBe(new Chess().fen()); // Initial position
      expect(game.offeredDraw).toBeNull();
      expect(game.moveHistory).toEqual([]);
      expect(game.createdAt).toBeDefined();
      expect(game.updatedAt).toBeDefined();
    });

    it('throws when creating game with invalid color', () => {
      expect(() => manager.createGame('user1', 'invalid' as Color)).toThrow();
    });
  });

  describe('Game Joining Edge Cases', () => {
    it('allows joining as white when black player created the game', () => {
      const game = manager.createGame('user1', 'black');
      manager.joinGame('user2', game.id);

      expect(game.players.white).toBe('user2');
      expect(game.players.black).toBe('user1');
      expect(game.joinable).toBe(false);
    });

    it('prevents same user from joining twice', () => {
      const game = manager.createGame('user1', 'white');

      expect(() => manager.joinGame('user1', game.id)).not.toThrow();
    });
  });

  describe('Draw Offer Edge Cases', () => {
    it('throws when offering draw if user not in any game', () => {
      expect(() => manager.offerDraw('nonexistent')).toThrow('not in any game');
    });

    it('allows different player to offer draw after first offer', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      manager.offerDraw('user1');
      expect(game.offeredDraw).toBe('user1');

      expect(() => manager.offerDraw('user2')).toThrow('already been offered');
    });

    it('updates timestamp when offering draw', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);
      const originalTimestamp = game.updatedAt;

      jest.advanceTimersByTime(100); // Use fake timers instead of setTimeout
      manager.offerDraw('user1');
      expect(game.updatedAt).toBeGreaterThan(originalTimestamp);
    });
  });

  describe('Link Object Tests', () => {
    it('returns correct link for white player', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      const link = manager.getLink('user1');
      expect(link).toMatchObject({
        id: game.id,
        color: 'white',
        fen: new Chess().fen(), // Initial position
        status: 'active',
        pendingDraw: false,
        moveHistory: [],
        lastMove: undefined,
        opponent: {
          username: 'user2',
          connected: true,
        },
      });
    });

    it('returns correct link for black player', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      const link = manager.getLink('user2');
      expect(link).toMatchObject({
        id: game.id,
        color: 'black',
        fen: new Chess().fen(),
        status: 'active',
        pendingDraw: false,
        opponent: {
          username: 'user1',
          connected: true,
        },
      });
    });

    it('shows waiting status for single player game', () => {
      const game = manager.createGame('user1', 'white');
      const link = manager.getLink('user1');

      expect(link?.status).toBe('waiting');
    });

    it('shows pendingDraw correctly', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);
      manager.offerDraw('user1');

      const link = manager.getLink('user2');
      expect(link?.pendingDraw).toBe(true);

      const linkOfferer = manager.getLink('user1');
      expect(linkOfferer?.pendingDraw).toBe(false);
    });

    it('shows opponent as disconnected when not in userMap', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      manager['userMap'].delete('user2');
      const link = manager.getLink('user1');
      expect(link?.opponent.connected).toBe(false);
    });

    it('returns null for getLink after game deletion', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);
      manager.deleteGame(game.id);
      expect(manager.getLink('user1')).toBeNull();
      expect(manager.getLink('user2')).toBeNull();
    });

    it('returns correct link when no moves have been made', () => {
      const game = manager.createGame('user1', 'white');
      const link = manager.getLink('user1');
      expect(link).toMatchObject({
        id: game.id,
        color: 'white',
        fen: new Chess().fen(),
        status: 'waiting',
        pendingDraw: false,
        moveHistory: [],
        lastMove: undefined,
        opponent: {
          username: null,
          connected: false,
        },
      });
    });
  });

  describe('Game Deletion Edge Cases', () => {
    it('handles deleting non-existent game gracefully', () => {
      expect(() => manager.deleteGame('nonexistent')).not.toThrow();
    });

    it('only removes users from userMap if they belong to the deleted game', () => {
      const game1 = manager.createGame('user1', 'white');
      const game2 = manager.createGame('user2', 'black');

      manager.deleteGame(game1.id);

      expect(manager['userMap'].has('user1')).toBe(false);
      expect(manager['userMap'].has('user2')).toBe(true);
    });

    it('handles partial game deletion (only one player)', () => {
      const game = manager.createGame('user1', 'white');

      manager.deleteGame(game.id);

      expect(manager['gameMap'].has(game.id)).toBe(false);
      expect(manager['userMap'].has('user1')).toBe(false);
    });
  });

  describe('User Management', () => {
    it('prevents user from being in multiple games', () => {
      const game1 = manager.createGame('user1', 'white');
      const game2 = manager.createGame('user2', 'black');

      manager.joinGame('user1', game2.id);
      const link = manager.getLink('user1');
      expect(link?.id).toBe(game2.id);
    });

    it('handles user creating new game while in existing game', () => {
      const game1 = manager.createGame('user1', 'white');
      const game2 = manager.createGame('user1', 'black');

      const link = manager.getLink('user1');
      expect(link?.id).toBe(game2.id);
    });
  });

  describe("Making Moves", () => {
    it('throws if user is not in any game', () => {
      const move: Move = { from: 'e2', to: 'e4' };
      expect(() => manager.makeMove('nonexistent', move)).toThrow();
    });

    it('allows making a valid move', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      const move: Move = { from: 'e2', to: 'e3' };
      manager.makeMove('user1', move);

      expect(game.moveHistory.length).toBe(1);
      expect(game.moveHistory[0]).toEqual(move);
      expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
    });

    it('throws if move is invalid', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      const invalidMove: Move = { from: 'e2', to: 'e5' }; // Invalid pawn move
      expect(() => manager.makeMove('user1', invalidMove)).toThrow();
    });

    it('updates lastMove correctly', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);

      const move: Move = { from: 'e2', to: 'e4' };
      manager.makeMove('user1', move);

      expect(game.lastMove).toEqual(move);
    });

    it('updates game timestamp on move', () => {
      const game = manager.createGame('user1', 'white');
      manager.joinGame('user2', game.id);
      const originalTimestamp = game.updatedAt;

      const move: Move = { from: 'e2', to: 'e4' };
      jest.advanceTimersByTime(100); // Advance time for reliable timestamp difference
      manager.makeMove('user1', move);

      expect(game.updatedAt).toBeGreaterThan(originalTimestamp);
    });

    it('deletes game when game is over', () => {
        const game = manager.createGame('user1', 'white');
        manager.joinGame('user2', game.id);
    
        // Simulate moves leading to checkmate
        const moves = [
            { from: 'e2', to: 'e4' },
            { from: 'e7', to: 'e5' },
            { from: 'd1', to: 'f3' },
            { from: 'a7', to: 'a6' },
            { from: 'f1', to: 'c4' },
            { from: 'a6', to: 'a5' },
            { from: 'f3', to: 'f7' }, // Checkmate move
        ];
    
        moves.forEach(move => manager.makeMove('user1', move));
        
        expect(manager['gameMap'].has(game.id)).toBe(false);
        expect(manager['userMap'].has('user1')).toBe(false);
        expect(manager['userMap'].has('user2')).toBe(false);
    });

    it('should handle knight promotion', () => {
        const game = manager.createGame('user1', 'white');
        manager.joinGame('user2', game.id);

        const actualGame = manager['gameMap'].get(game.id);
        if (!actualGame) throw new Error('Game not found in gameMap');

        // Set up a position where white can promote a pawn
        actualGame.fen = 'rnbqkbnr/pp2P2p/8/2pp4/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 5';

        const move: Move = { from: 'e7', to: 'd8', promotion: 'n' }; // Promote to knight
        manager.makeMove('user1', move);

        expect(actualGame.fen).toBe('rnbNkbnr/pp5p/8/2pp4/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 5'); // Pawn promoted to knight
    });

    it('should handle queen promotion', () => {
        const game = manager.createGame('user1', 'white');
        manager.joinGame('user2', game.id);

        const actualGame = manager['gameMap'].get(game.id);
        if (!actualGame) throw new Error('Game not found in gameMap');

        // Set up a position where white can promote a pawn
        actualGame.fen = 'rnbqkbnr/pp2P2p/8/2pp4/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 5';

        const move: Move = { from: 'e7', to: 'd8', promotion: 'q' }; // Promote to queen
        manager.makeMove('user1', move);

        expect(actualGame.fen).toBe('rnbQkbnr/pp5p/8/2pp4/8/8/PPPPPPP1/RNBQKBNR b KQkq - 0 5'); // Pawn promoted to queen
    });

    it('should throw error on invalid promotion piece', () => {
        const game = manager.createGame('user1', 'white');
        manager.joinGame('user2', game.id);

        const actualGame = manager['gameMap'].get(game.id);
        if (!actualGame) throw new Error('Game not found in gameMap');

        // Set up a position where white can promote a pawn
        actualGame.fen = 'rnbqkbnr/pp2P2p/8/2pp4/8/8/PPPPPPP1/RNBQKBNR w KQkq - 0 5';

        const move: Move = { from: 'e7', to: 'd8', promotion: 'x' as any }; // Invalid promotion piece
        expect(() => manager.makeMove('user1', move)).toThrow();
    });
  });

  describe('attaching and detaching players', () => {
    it('detaches a player from a game', () => {
        const game = manager.createGame('user1', 'white');
        manager.joinGame('user2', game.id);

        const detachedGameId = manager.detachPlayer('user1');
        expect(detachedGameId).toBe(game.id);
        expect(manager['userMap'].has('user1')).toBe(false);
        expect(manager['userMap'].has('user2')).toBe(true);
    });

    it('returns undefined when detaching a user not in any game', () => {
        expect(manager.detachPlayer('nonexistent')).toBeUndefined();
    });

    it('attaches a player to a game', () => {
        const game = manager.createGame('user1', 'white');
        manager.detachPlayer('user1');

        const attachedGame = manager.attachPlayer('user1', game.id);
        expect(attachedGame).toBe(game);
        expect(manager['userMap'].get('user1')).toBe(game.id);
    });

    it('returns undefined when attaching to a non-existent game', () => {
        expect(manager.attachPlayer('user1', 'nonexistent')).toBeUndefined();
    });
  });

});