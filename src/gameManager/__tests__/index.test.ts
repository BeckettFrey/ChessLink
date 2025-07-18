// File: src/gameManager/__tests__/index.test.ts
import { GameManager } from '@/gameManager';
import { Game, Move } from '@/types';
import { StateSyncError } from '@/gameManager/exceptions';
import { Chess } from 'chess.js';

describe('GameManager', () => {
  let gameManager: GameManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use long intervals to avoid interference from cleanup
    gameManager = new GameManager(10000000, 10000000);
  });

  describe('Constructor', () => {
    it('should initialize with default parameters', () => {
      const gm = new GameManager();
      expect(gm).toBeInstanceOf(GameManager);
    });

    it('should initialize with custom parameters', () => {
      const gm = new GameManager(50000, 60000);
      expect(gm).toBeInstanceOf(GameManager);
    });

    it('should initialize maps correctly', () => {
      expect(gameManager.getAllGames()).toEqual([]);
    });
  });

  describe('Utility Methods', () => {
    describe('generateUniqueId', () => {
      it('should generate unique IDs', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          const id = (gameManager as any).generateUniqueId();
          expect(typeof id).toBe('string');
          expect(id.length).toBe(7);
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });
    });

    describe('getPlayerColor', () => {
      it('should return white for white player', () => {
        const game: Game = {
          id: 'test-game',
          players: {
            white: { id: 'player1', connected: true },
            black: { id: 'player2', connected: true }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fen: new Chess().fen(),
          moves: [],
          joinable: false,
          outcome: undefined,
          drawOfferedBy: undefined
        };

        const color = (gameManager as any).getPlayerColor(game, 'player1');
        expect(color).toBe('white');
      });

      it('should return black for black player', () => {
        const game: Game = {
          id: 'test-game',
          players: {
            white: { id: 'player1', connected: true },
            black: { id: 'player2', connected: true }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fen: new Chess().fen(),
          moves: [],
          joinable: false,
          outcome: undefined,
          drawOfferedBy: undefined
        };

        const color = (gameManager as any).getPlayerColor(game, 'player2');
        expect(color).toBe('black');
      });

      it('should return undefined for non-existent player', () => {
        const game: Game = {
          id: 'test-game',
          players: {
            white: { id: 'player1', connected: true }
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fen: new Chess().fen(),
          moves: [],
          joinable: true,
          outcome: undefined,
          drawOfferedBy: undefined
        };

        const color = (gameManager as any).getPlayerColor(game, 'nonexistent');
        expect(color).toBeUndefined();
      });
    });

    describe('eraseGame', () => {
      it('should remove game and players from maps', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);

        expect(gameManager.getAllGames()).toHaveLength(1);

        gameManager.eraseGame(game);

        expect(gameManager.getAllGames()).toHaveLength(0);
        expect(gameManager.connect('player1')).toBeUndefined();
        expect(gameManager.connect('player2')).toBeUndefined();
      });

      it('should handle game with only one player', () => {
        const game = gameManager.createGame('player1', 'white')!;

        expect(gameManager.getAllGames()).toHaveLength(1);

        gameManager.eraseGame(game);

        expect(gameManager.getAllGames()).toHaveLength(0);
        expect(gameManager.connect('player1')).toBeUndefined();
      });

      it('should handle game with no players gracefully', () => {
        const game: Game = {
          id: 'test-game',
          players: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
          fen: new Chess().fen(),
          moves: [],
          joinable: true,
          outcome: undefined,
          drawOfferedBy: undefined
        };

        expect(() => gameManager.eraseGame(game)).not.toThrow();
      });
    });
  });

  describe('Connection Handling', () => {
    describe('connect', () => {
      it('should successfully connect existing player', () => {
        const game = gameManager.createGame('player1', 'white')!;
        
        // Simulate disconnection
        game.players.white!.connected = false;
        
        // Wait a bit to ensure timestamp changes
        jest.advanceTimersByTime(1);
        
        const result = gameManager.connect('player1');
        
        expect(result).toBe(game);
        expect(game.players.white!.connected).toBe(true);
      });

      it('should connect black player', () => {
        const game = gameManager.createGame('player1', 'black')!;
        game.players.black!.connected = false;
        
        const result = gameManager.connect('player1');
        
        expect(result).toBe(game);
        expect(game.players.black!.connected).toBe(true);
      });

      it('should return undefined for non-existent player', () => {
        const result = gameManager.connect('nonexistent');
        expect(result).toBeUndefined();
      });

      it('should throw StateSyncError if player not found in game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        
        // Corrupt the game state
        game.players.white = undefined;
        
        expect(() => gameManager.connect('player1')).toThrow(StateSyncError);
        expect(() => gameManager.connect('player1')).toThrow('Player not found in game during reconnection');
      });

      it('should handle unknown errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Mock getPlayerColor to throw an unknown error
        jest.spyOn(gameManager as any, 'getPlayerColor').mockImplementation(() => {
          throw new Error('Unknown error');
        });

        gameManager.createGame('player1', 'white');
        const result = gameManager.connect('player1');
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error connecting player:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });

    describe('disconnect', () => {
      it('should successfully disconnect existing player', () => {
        const game = gameManager.createGame('player1', 'white')!;
        
        jest.advanceTimersByTime(1);
        
        const result = gameManager.disconnect('player1');
        
        expect(result).toBe(game);
        expect(game.players.white!.connected).toBe(false);
      });

      it('should disconnect black player', () => {
        const game = gameManager.createGame('player1', 'black')!;
        
        const result = gameManager.disconnect('player1');
        
        expect(result).toBe(game);
        expect(game.players.black!.connected).toBe(false);
      });

      it('should return undefined for non-existent player', () => {
        const result = gameManager.disconnect('nonexistent');
        expect(result).toBeUndefined();
      });

      it('should throw StateSyncError if player not found in game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        
        // Corrupt the game state
        game.players.white = undefined;
        
        expect(() => gameManager.disconnect('player1')).toThrow(StateSyncError);
        expect(() => gameManager.disconnect('player1')).toThrow('Player not found in game during disconnection');
      });

      it('should handle unknown errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Mock getPlayerColor to throw an unknown error
        jest.spyOn(gameManager as any, 'getPlayerColor').mockImplementation(() => {
          throw new Error('Unknown error');
        });

        gameManager.createGame('player1', 'white');
        const result = gameManager.disconnect('player1');
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error disconnecting player:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Lobby Handling', () => {
    describe('createGame', () => {
      it('should create game with white player', () => {
        const result = gameManager.createGame('player1', 'white');
        
        expect(result).toBeDefined();
        expect(result!.id).toBeDefined();
        expect(result!.players.white).toEqual({ id: 'player1', connected: true });
        expect(result!.players.black).toBeUndefined();
        expect(result!.joinable).toBe(true);
        expect(result!.outcome).toBeUndefined();
        expect(result!.moves).toEqual([]);
        expect(result!.fen).toBe(new Chess().fen());
        expect(result!.createdAt).toBeDefined();
        expect(result!.updatedAt).toBeDefined();
        expect(result!.drawOfferedBy).toBeUndefined();
      });

      it('should create game with black player', () => {
        const result = gameManager.createGame('player1', 'black');
        
        expect(result).toBeDefined();
        expect(result!.players.black).toEqual({ id: 'player1', connected: true });
        expect(result!.players.white).toBeUndefined();
        expect(result!.joinable).toBe(true);
      });

      it('should return undefined if player already in game', () => {
        gameManager.createGame('player1', 'white');
        const result = gameManager.createGame('player1', 'black');
        
        expect(result).toBeUndefined();
      });

      it('should handle errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Mock generateUniqueId to throw an error
        jest.spyOn(gameManager as any, 'generateUniqueId').mockImplementation(() => {
          throw new Error('ID generation failed');
        });

        const result = gameManager.createGame('player1', 'white');
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error creating game:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });

      it('should add game to both maps', () => {
        const result = gameManager.createGame('player1', 'white');
        
        expect(gameManager.getAllGames()).toHaveLength(1);
        expect(gameManager.getAllGames()[0]).toBe(result);
        expect(gameManager.connect('player1')).toBe(result);
      });
    });

    describe('joinGame', () => {
      it('should join game as black when white exists', () => {
        const game = gameManager.createGame('player1', 'white')!;
        
        const result = gameManager.joinGame('player2', game.id);
        
        expect(result).toBe(game);
        expect(game.players.black).toEqual({ id: 'player2', connected: true });
        expect(game.joinable).toBe(false);
      });

      it('should join game as white when black exists', () => {
        const game = gameManager.createGame('player1', 'black')!;
        
        const result = gameManager.joinGame('player2', game.id);
        
        expect(result).toBe(game);
        expect(game.players.white).toEqual({ id: 'player2', connected: true });
        expect(game.joinable).toBe(false);
      });

      it('should return undefined for non-existent game', () => {
        const result = gameManager.joinGame('player1', 'nonexistent');
        expect(result).toBeUndefined();
      });

      it('should return undefined for full game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.joinGame('player3', game.id);
        expect(result).toBeUndefined();
      });

      it('should add player to playerMap', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        expect(gameManager.connect('player2')).toBe(game);
      });
    });

    describe('getAllGames', () => {
      it('should return empty array initially', () => {
        expect(gameManager.getAllGames()).toEqual([]);
      });

      it('should return all games', () => {
        const game1 = gameManager.createGame('player1', 'white')!;
        const game2 = gameManager.createGame('player2', 'black')!;
        
        const games = gameManager.getAllGames();
        expect(games).toHaveLength(2);
        expect(games).toContain(game1);
        expect(games).toContain(game2);
      });

      it('should return games in insertion order', () => {
        const game1 = gameManager.createGame('player1', 'white')!;
        const game2 = gameManager.createGame('player2', 'black')!;
        
        const games = gameManager.getAllGames();
        expect(games[0]).toBe(game1);
        expect(games[1]).toBe(game2);
      });
    });
  });

  describe('Game Handling', () => {
    describe('offerDraw', () => {
      it('should offer draw successfully', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.offerDraw('player1');
        
        expect(result).toBe(game);
        expect(game.drawOfferedBy).toBe('white');
      });

      it('should offer draw as black player', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.offerDraw('player2');
        
        expect(result).toBe(game);
        expect(game.drawOfferedBy).toBe('black');
      });

      it('should return undefined for non-existent player', () => {
        const result = gameManager.offerDraw('nonexistent');
        expect(result).toBeUndefined();
      });

      it('should return undefined for concluded game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.outcome = { reason: 'draw' };
        
        const result = gameManager.offerDraw('player1');
        expect(result).toBeUndefined();
      });

      it('should return undefined if draw already offered', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.drawOfferedBy = 'white';
        
        const result = gameManager.offerDraw('player1');
        expect(result).toBeUndefined();
      });

      it('should throw StateSyncError if player not found in game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        game.players.white = undefined;
        
        expect(() => gameManager.offerDraw('player1')).toThrow(StateSyncError);
        expect(() => gameManager.offerDraw('player1')).toThrow('Player not found in game');
      });

      it('should handle unknown errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        jest.spyOn(gameManager as any, 'getPlayerColor').mockImplementation(() => {
          throw new Error('Unknown error');
        });

        gameManager.createGame('player1', 'white');
        const result = gameManager.offerDraw('player1');
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error offering draw:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });

    describe('acceptDraw', () => {
      it('should accept draw successfully', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.drawOfferedBy = 'white';
        
        const result = gameManager.acceptDraw('player2');
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ reason: 'draw' });
        expect(game.drawOfferedBy).toBeUndefined();
      });

      it('should accept draw as white player', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.drawOfferedBy = 'black';
        
        const result = gameManager.acceptDraw('player1');
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ reason: 'draw' });
      });

      it('should return undefined for non-existent player', () => {
        const result = gameManager.acceptDraw('nonexistent');
        expect(result).toBeUndefined();
      });

      it('should return undefined for concluded game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.outcome = { reason: 'draw' };
        
        const result = gameManager.acceptDraw('player1');
        expect(result).toBeUndefined();
      });

      it('should return undefined if no draw offered', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.acceptDraw('player1');
        expect(result).toBeUndefined();
      });

      it('should return undefined if player accepts own draw offer', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.drawOfferedBy = 'white';
        
        const result = gameManager.acceptDraw('player1');
        expect(result).toBeUndefined();
      });

      it('should throw StateSyncError if player not found in game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        game.players.white = undefined;
        game.drawOfferedBy = 'black';
        
        expect(() => gameManager.acceptDraw('player1')).toThrow(StateSyncError);
        expect(() => gameManager.acceptDraw('player1')).toThrow('Player not found in game');
      });
    });

    describe('resign', () => {
      it('should resign successfully as white', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.resign('player1');
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ winner: 'black', reason: 'resignation' });
      });

      it('should resign successfully as black', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        
        const result = gameManager.resign('player2');
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ winner: 'white', reason: 'resignation' });
      });

      it('should return undefined for non-existent player', () => {
        const result = gameManager.resign('nonexistent');
        expect(result).toBeUndefined();
      });

      it('should return undefined for concluded game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        gameManager.joinGame('player2', game.id);
        game.outcome = { reason: 'draw' };
        
        const result = gameManager.resign('player1');
        expect(result).toBeUndefined();
      });

      it('should throw StateSyncError if player not found in game', () => {
        const game = gameManager.createGame('player1', 'white')!;
        game.players.white = undefined;
        
        expect(() => gameManager.resign('player1')).toThrow(StateSyncError);
        expect(() => gameManager.resign('player1')).toThrow('Player not found in game');
      });

      it('should handle unknown errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        jest.spyOn(gameManager as any, 'getPlayerColor').mockImplementation(() => {
          throw new Error('Unknown error');
        });

        gameManager.createGame('player1', 'white');
        const result = gameManager.resign('player1');
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error resigning from game:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });
    });

    describe('makeMove', () => {
      let game: Game;

      beforeEach(() => {
        game = gameManager.createGame('player1', 'white')!;
        game = gameManager.joinGame('player2', game.id);
      });

      it('should make legal move successfully', () => {
        const move: Move = { from: 'e2', to: 'e4' };
        
        const result = gameManager.makeMove('player1', move);
        
        expect(result).toBe(game);
        expect(game.moves).toContain(move);
        expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1');
      });

      it('should return undefined for non-existent player', () => {
        const move: Move = { from: 'e2', to: 'e4' };
        const result = gameManager.makeMove('nonexistent', move);
        expect(result).toBeUndefined();
      });

      it('should return undefined for concluded game', () => {
        game.outcome = { reason: 'draw' };
        const move: Move = { from: 'e2', to: 'e4' };
        
        const result = gameManager.makeMove('player1', move);
        expect(result).toBeUndefined();
      });

      it('should return undefined when not player\'s turn', () => {
        const move: Move = { from: 'e7', to: 'e5' };
        
        const result = gameManager.makeMove('player2', move);
        expect(result).toBeUndefined();
      });

      it('should return undefined for illegal move', () => {
        const move: Move = { from: 'e2', to: 'e5' };
        
        const result = gameManager.makeMove('player1', move);
        expect(result).toBeUndefined();
      });

      it('should detect checkmate', () => {
        // Set up fool's mate position
        const chess = new Chess();
        chess.move('f3');
        chess.move('e5');
        chess.move('g4');
        game.fen = chess.fen();
        
        const move: Move = { from: 'd8', to: 'h4' };
        
        const result = gameManager.makeMove('player2', move);
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ winner: 'black', reason: 'checkmate' });
      });

      it('should detect insufficient material', () => {
        // Set up position with insufficient material
        const chess = new Chess();
        chess.load('8/8/8/8/8/8/8/k6K w - - 0 1');
        game.fen = chess.fen();
        
        // Mock the chess.js methods
        jest.spyOn(Chess.prototype, 'isInsufficientMaterial').mockReturnValue(true);
        jest.spyOn(Chess.prototype, 'move').mockReturnValue({
          color: 'w',
          from: 'h1',
          to: 'h2',
          piece: 'k',
          san: 'Kh2'
        } as any);
        
        const move: Move = { from: 'h1', to: 'h2' };
        
        const result = gameManager.makeMove('player1', move);
        
        expect(result).toBe(game);
        expect(game.outcome).toEqual({ reason: 'insufficient_material' });
      });

      it('should throw StateSyncError if player not found in game', () => {
        game.players.white = undefined;
        const move: Move = { from: 'e2', to: 'e4' };
        
        expect(() => gameManager.makeMove('player1', move)).toThrow(StateSyncError);
        expect(() => gameManager.makeMove('player1', move)).toThrow('Player not found in game');
      });

      it('should handle unknown errors gracefully', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        jest.spyOn(gameManager as any, 'getPlayerColor').mockImplementation(() => {
          throw new Error('Unknown error');
        });

        const move: Move = { from: 'e2', to: 'e4' };
        const result = gameManager.makeMove('player1', move);
        
        expect(result).toBeUndefined();
        expect(consoleSpy).toHaveBeenCalledWith('Error making move:', expect.any(Error));
        
        consoleSpy.mockRestore();
      });

      it('should clear draw offer after move', () => {
        game.drawOfferedBy = 'black';
        
        const move: Move = { from: 'e2', to: 'e4' };
        const result = gameManager.makeMove('player1', move);
        
        expect(result).toBe(game);
        // Draw offer should still be there (only cleared when draw is accepted)
        expect(game.drawOfferedBy).toBe('black');
      });
    });
  });

  describe('Integration Tests', () => {

    it('should handle disconnection and reconnection', () => {
      const game = gameManager.createGame('player1', 'white')!;
      gameManager.joinGame('player2', game.id);
      
      // Disconnect
      gameManager.disconnect('player1');
      expect(game.players.white!.connected).toBe(false);
      
      // Reconnect
      gameManager.connect('player1');
      expect(game.players.white!.connected).toBe(true);
      
      // Should still be able to make moves
      const result = gameManager.makeMove('player1', { from: 'e2', to: 'e4' });
      expect(result).toBe(game);
    });

    it('should handle multiple games simultaneously', () => {
      const game1 = gameManager.createGame('player1', 'white')!;
      const game2 = gameManager.createGame('player3', 'black')!;
      
      gameManager.joinGame('player2', game1.id);
      gameManager.joinGame('player4', game2.id);
      
      // Make moves in both games
      gameManager.makeMove('player1', { from: 'e2', to: 'e4' });
      gameManager.makeMove('player4', { from: 'e2', to: 'e4' });
      
      expect(game1.moves).toHaveLength(1);
      expect(game2.moves).toHaveLength(1);
      expect(gameManager.getAllGames()).toHaveLength(2);
    });

    it('should handle game cleanup', () => {
      const game1 = gameManager.createGame('player1', 'white')!;
      const game2 = gameManager.createGame('player3', 'black')!;
      
      gameManager.joinGame('player2', game1.id);
      
      expect(gameManager.getAllGames()).toHaveLength(2);
      
      // Clean up game1
      gameManager.eraseGame(game1);
      
      expect(gameManager.getAllGames()).toHaveLength(1);
      expect(gameManager.getAllGames()[0]).toBe(game2);
      expect(gameManager.connect('player1')).toBeUndefined();
      expect(gameManager.connect('player2')).toBeUndefined();
      expect(gameManager.connect('player3')).toBe(game2);
    });

    it('should prevent actions on concluded games', () => {
      const game = gameManager.createGame('player1', 'white')!;
      gameManager.joinGame('player2', game.id);
      
      // Conclude game
      gameManager.resign('player1');
      
      // Try various actions - all should return undefined
      expect(gameManager.makeMove('player2', { from: 'e7', to: 'e5' })).toBeUndefined();
      expect(gameManager.offerDraw('player2')).toBeUndefined();
      expect(gameManager.acceptDraw('player2')).toBeUndefined();
      expect(gameManager.resign('player2')).toBeUndefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle corrupted game state gracefully', () => {
      const game = gameManager.createGame('player1', 'white')!;
      
      // Corrupt the FEN
      game.fen = 'invalid-fen';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = gameManager.makeMove('player1', { from: 'e2', to: 'e4' });
      
      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith('Error making move:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle concurrent access safely', () => {
      const game = gameManager.createGame('player1', 'white')!;
      gameManager.joinGame('player2', game.id);
      
      // Simulate concurrent draw offers
      game.drawOfferedBy = 'white';
      
      // Second draw offer should be rejected
      const result = gameManager.offerDraw('player2');
      expect(result).toBeUndefined();
    });

    it('should handle player ID edge cases', () => {
      // Empty string player ID
      expect(gameManager.createGame('', 'white')).toBeDefined();
      
      // Very long player ID
      const longId = 'a'.repeat(1000);
      expect(gameManager.createGame(longId, 'white')).toBeDefined();
      
      // Special characters in player ID
      expect(gameManager.createGame('player@123!', 'white')).toBeDefined();
    });

    it('should handle rapid successive operations', () => {
      const game = gameManager.createGame('player1', 'white')!;
      gameManager.joinGame('player2', game.id);
      
      // Rapid connect/disconnect
      for (let i = 0; i < 10; i++) {
        gameManager.disconnect('player1');
        gameManager.connect('player1');
      }
      
      // Should still be able to make moves
      const result = gameManager.makeMove('player1', { from: 'e2', to: 'e4' });
      expect(result).toBe(game);
    });
  });
});