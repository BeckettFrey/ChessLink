// File: src/gameManager/index.ts
import { Game, Move, Color } from '@/types';
import { GameManagerAPI } from './types';
import { StateSyncError } from './exceptions';
import { 
  CleaningService,
  CleaningServiceConstructor, 
  CleaningServiceInterface 
} from '@/services/cleaningService';
import { Chess } from 'chess.js';

export * from './types';
export * from './exceptions';

export class GameManager implements GameManagerAPI {
  private playerMap: Map<string, Game>;  // userId -> Game
  private gameMap: Map<string, Game>;    // gameId -> Game
  private cleaner: CleaningServiceInterface;

  constructor(
    cleanupIntervalMs = 100000,
    staleThresholdMs = 100000,
    Cleaner: CleaningServiceConstructor = CleaningService 
  ) {
    this.playerMap = new Map();
    this.gameMap = new Map();

    this.cleaner = new Cleaner(
      this.gameMap,
      cleanupIntervalMs,
      staleThresholdMs,
       this.eraseGame.bind(this) 
    );
  }

  // ---- Utility Methods ----
  private generateUniqueId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private getPlayerColor(game: Game, playerId: string): Color | undefined {
    if (game.players.white?.id === playerId) return 'white';
    if (game.players.black?.id === playerId) return 'black';
    return undefined;
  }

  // --- Cleanup Protocol ---
  public eraseGame = (obj: any): void => {
    const game = obj as Game;
    if (!game || !game.players || !game.id) return;
    for (const color of ['white', 'black'] as const) {
      const playerId = game.players[color]?.id;
      if (playerId) {
        this.playerMap.delete(playerId);
      }
    }
    this.gameMap.delete(game.id);
  }

  // --- Connection Handling ---
  public connect(playerId: string): Game | undefined { 
    try {
      const game = this.playerMap.get(playerId);

      if (game) {
        // Process reconnection
        const playerColor = this.getPlayerColor(game, playerId);
        if (!playerColor) {
          throw new StateSyncError('Player not found in game during reconnection');
        }

        if (game.players[playerColor]) {
          game.players[playerColor].connected = true;
          game.updatedAt = Date.now();
          return game;
        }
      }

    } catch (error) {
      // Throw known errors, log uncharted ones
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error connecting player:', error);
    }
    return undefined;
  }
   
  public disconnect(playerId: string): Game | undefined { 
    try {
      const game = this.playerMap.get(playerId);

      if (game) {
        // Process disconnection
        const playerColor = this.getPlayerColor(game, playerId);
        if (!playerColor) {
          throw new StateSyncError('Player not found in game during disconnection');
        }
        
        if(game.players[playerColor]) {
          game.players[playerColor].connected = false;
          game.updatedAt = Date.now();
        }
        return game;
      }

    } catch (error) {
      // Throw known errors, log uncharted ones
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error disconnecting player:', error);
    }
    return undefined;
  }

  // --- Lobby Handling ---
  public createGame(playerId: string, color: Color): Game | undefined { 
    const game = this.playerMap.get(playerId);
    if (game) return undefined; // Player already in a game

    try {

      const newGame: Game = {
        id: this.generateUniqueId(),
        players: {
          [color]: { id: playerId, connected: true }
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fen: new Chess().fen(),
        moves: [],
        joinable: true,
        outcome: undefined,
        drawOfferedBy: undefined
      };

      this.playerMap.set(playerId, newGame);
      this.gameMap.set(newGame.id, newGame);
      return newGame;

    } catch (error) {
      console.error('Error creating game:', error);
      return undefined;
    }
  }

  public joinGame(playerId: string, gameId: string): Game | undefined { 
    try {
    
      const game = this.gameMap.get(gameId);
      if (!game) return undefined;

      // Process joining
      if (game.players.white && game.players.black) {
        return undefined; // Game full
      }

      const playerColor = game.players.white ? 'black' : 'white';
      game.players[playerColor] = { id: playerId, connected: true };
      
      game.joinable = false;
      game.updatedAt = Date.now();

      this.playerMap.set(playerId, game);
      return game;
    } catch (error) {
      console.error('Error joining game:', error);
      return undefined;
    }
  }

  public getAllGames(): Game[] { return Array.from(this.gameMap.values()); }

  // --- Game Handling ---
  public offerDraw(playerId: string): Game | undefined { 

    try {

      const game = this.playerMap.get(playerId);
      if (!game) return undefined; // Player not in a game
      if (game.outcome) return undefined; // Game already concluded
      if (game.drawOfferedBy) return undefined; // Draw already offered

      const playerColor = this.getPlayerColor(game, playerId);

      if (!playerColor) {
        throw new StateSyncError('Player not found in game');
      }

      game.drawOfferedBy = playerColor;
      game.updatedAt = Date.now();
      return game;

    } catch (error) {
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error offering draw:', error);
    }
    return undefined;
  }

  public acceptDraw(playerId: string): Game | undefined { 
    try {

      const game = this.playerMap.get(playerId);
      if (!game) return undefined; // Player not in a game
      if (game.outcome) return undefined; // Game already concluded
      if (!game.drawOfferedBy) return undefined; // No draw offered

      const playerColor = this.getPlayerColor(game, playerId);

      if (!playerColor) {
        throw new StateSyncError('Player not found in game');
      }

      if (game.drawOfferedBy === playerColor) {
        return undefined; // Player cannot accept their own draw offer
      }

      game.outcome = { reason: 'draw' };
      game.drawOfferedBy = undefined;
      game.updatedAt = Date.now();
      return game;

    } catch (error) {
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error accepting draw:', error);
    }
    return undefined;
  }

  public resign(playerId: string): Game | undefined { 
    try {

      const game = this.playerMap.get(playerId);
      if (!game) return undefined; // Player not in a game
      if (game.outcome) return undefined; // Game already concluded

      const playerColor = this.getPlayerColor(game, playerId);
      if (!playerColor) {
        throw new StateSyncError('Player not found in game');
      }

      const winnerColor = playerColor === 'white' ? 'black' : 'white';
      game.outcome = { winner: winnerColor, reason: 'resignation' };
      game.updatedAt = Date.now();
      return game;

    } catch (error) {
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error resigning from game:', error);
    }
    return undefined;

   }

  public makeMove(playerId: string, move: Move): Game | undefined { 
    try {
      
      const game = this.playerMap.get(playerId);
      if (!game) return undefined; // Player not in a game
      if (game.outcome) return undefined; // Game already concluded

      const playerColor = this.getPlayerColor(game, playerId);
      if (!playerColor) {
        throw new StateSyncError('Player not found in game');
      }

      const chess = new Chess(game.fen);
      const turn = chess.turn() === 'w' ? 'white' : 'black';
      if (turn !== playerColor) {
        return undefined; // Not player's turn
      }

      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (!result) {
        return undefined; // Illegal move
      }

      game.fen = chess.fen();
      game.moves.push(move);
      game.updatedAt = Date.now();

      // Check for game conclusion
      if (chess.isCheckmate()) {
        game.outcome = { winner: playerColor, reason: 'checkmate' };
      } else if (chess.isStalemate()) {
        game.outcome = { reason: 'stalemate' };
      } else if (chess.isInsufficientMaterial()) {
        game.outcome = { reason: 'insufficient_material' };
      } else if (chess.isThreefoldRepetition()) {
        game.outcome = { reason: 'threefold_repetition' };
      } else if (chess.isDraw()) {
        game.outcome = { reason: 'draw' };
      }

      return game;

    } catch (error) {
      if (error instanceof StateSyncError) {
        throw error;
      }
      console.error('Error making move:', error);
    }
    return undefined;
   }
}