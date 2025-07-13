// ./types/Game.ts

/**
 * Represents the minimal game data shown in the lobby listing.
 * Only includes what's needed to display joinable games.
 */
export interface BaseGame {
  /** Unique identifier for this game session */
  id: string;

  /** Indicates if the game can accept a new player */
  joinable: boolean;

  /** Tracks which players have joined (by username), or null if open */
  players: {
    white: string | null;
    black: string | null;
  };
}

/**
 * Represents the complete server-side game object.
 * Includes full state, move history, and bookkeeping fields.
 */
export interface Game extends BaseGame {
  /** Unix timestamps for auditing and cleanup logic */
  createdAt: number;
  updatedAt: number;

  /** Current FEN string representing the board state */
  fen: string;

  /** User ID of the player who offered a draw this turn, or null if none */
  offeredDraw: string | null;

  /** Full sequential move history in standard algebraic notation (SAN) */
  moveHistory: string[];
}
