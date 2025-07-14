// File: src/gameManager/index.ts
import { Game, Color, Link, Move } from '@types';
import { CleaningService } from '@services/cleaningService';
import { Chess } from 'chess.js';

export class GameManager {
  private userMap: Map<string, string>;  // userId -> gameId
  private gameMap: Map<string, Game>;    // gameId -> Game

  constructor() {
    this.userMap = new Map();
    this.gameMap = new Map();

    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    new CleaningService(this.gameMap, twentyFourHoursMs, twelveHoursMs);
  }

  /**
   * Generates a unique game ID string (private).
   */
  private generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Gets a game directly by gameId (private).
   */
  private getGame(gameId: string): Game | undefined {
    return this.gameMap.get(gameId);
  }

  /**
   * Retrieves a game by userId (if user is in any game).
   */
  private getUserGame(userId: string): Game | undefined {
    const gameId = this.userMap.get(userId);
    return this.getGame(gameId);
  }

  /**
   * Retrieves the link data for a user in a game, or null if not in any game.
   */
  public getLink(userId: string): Link | null {
    const game = this.getUserGame(userId);
    if (game) {
      const link: Link = {
        id: game.id,
        color: game.players.white === userId ? 'white' : 'black',
        fen: game.fen,
        status: game.joinable ? 'waiting' : 'active',
        pendingDraw: game.offeredDraw && game.offeredDraw !== userId ? true : false,
        moveHistory: game.moveHistory,
        lastMove: game.lastMove,
        // username is userId for now
        opponent: game.players.white === userId ? {
          username: game.players.black,
          connected: this.userMap.has(game.players.black)
        } : {
          username: game.players.white,
          connected: this.userMap.has(game.players.white)
        }
      };
      return link;
    }
    return null;
  }
  
  /**
   * Creates a new chess game for the user with chosen color.
   */
  public createGame(userId: string, color: Color): Game {
    const gameId = this.generateGameId();
    const now = new Date().getTime();
    if(color !== 'white' && color !== 'black') {
      throw new Error('Invalid color. Must be "white" or "black".');
    }
    const game: Game = {
      id: gameId,
      joinable: true,
      fen: new Chess().fen(), // Start with initial position
      players: {
        white: color === 'white' ? userId : null,
        black: color === 'black' ? userId : null
      },
      offeredDraw: null,
      moveHistory: [],
      createdAt: now,
      updatedAt: now,
    };
    this.userMap.set(userId, gameId);
    this.gameMap.set(gameId, game);
    return game;
  }

  /**
   * Joins a user to an existing game by ID.
   */
  public joinGame(userId: string, gameId: string): void {
    const game = this.getGame(gameId);
    if (game) {
      // Check if the game is joinable
      if (!game.joinable) {
        throw new Error(`already full`);
      }

      // Assign the user to the appropriate color
      if (!game.players.white) {
        game.players.white = userId;
      } else if (!game.players.black) {
        game.players.black = userId;
      } else {
        throw new Error(`Game with ID ${gameId} is already full.`);
      }

      // Set joinable to false if both players have joined
      if (game.players.white && game.players.black) {
        game.joinable = false;
      }

      // Update timestamps
      game.updatedAt = Date.now();

      // Set the user-game mapping
      this.userMap.set(userId, gameId);
    } else {
      throw new Error(`Game with ID ${gameId} not found.`);
    }
  };

  /**
   * Deletes all data related to a game, cleaning up user and game mappings.
   */
  public deleteGame(gameId: string): void {
    const game = this.getGame(gameId);
    if (game) {
      // Remove all users from userMap
      if (game.players.white && this.userMap.get(game.players.white) === gameId) {
        this.userMap.delete(game.players.white);
      }

      if (game.players.black && this.userMap.get(game.players.black) === gameId) {
        this.userMap.delete(game.players.black);
      }
    }
    // Remove the game from gameMap
    this.gameMap.delete(gameId);
  }

  /**
   * Handles a draw offer from a user.
   */
  public offerDraw(userId: string): void {
    const game = this.getUserGame(userId);
    if (game) {
      if (game.offeredDraw) {
        throw new Error('A draw has already been offered in this game.');
      }
      game.offeredDraw = userId;
      game.updatedAt = Date.now();
    } else {
      throw new Error('User is not in any game.');
    }
  }

  /**
   * Processes a move made by a user in their game.
   */
  public makeMove(userId: string, move: Move): void {
    const game = this.getUserGame(userId);
    if (!game) {
        throw new Error('User is not in any game.');
    }

    // Initialize chess.js instance with current game position or start position
    const chess = new Chess(game.fen || undefined);

    // Validate the move
    try {
        const validatedMove = chess.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion // Include promotion if provided
        });

        if (!validatedMove) {
            throw new Error('Invalid move.');
        }

        // Update game state
        game.moveHistory.push(move);
        game.lastMove = move;
        game.fen = chess.fen(); // Update FEN
        game.offeredDraw = null;
        game.updatedAt = Date.now();

        // Check for game over conditions
        if (chess.isGameOver()) {
            this.deleteGame(game.id);
            this.userMap.delete(game.players.white);
            this.userMap.delete(game.players.black);
        }
    } catch (error) {
        throw new Error(`${error.message}`);
    }
  }

  public detachPlayer(userId: string): string | undefined {
    const game = this.getUserGame(userId);
    if (game) {
      // Remove user from userMap
      this.userMap.delete(userId);
      return game.id;
    }
    return undefined;
  }

  public attachPlayer(userId: string, gameId: string): Game | undefined {
    const game = this.getGame(gameId);
    if (game) {
      // Re-associate user with game
      this.userMap.set(userId, gameId);
      return game;
    }
      return undefined;
  }
}
