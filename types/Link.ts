/**
 * Represents a single chess move.
 */
export interface Move {
  /** The square the piece moved from (e.g. "e2") */
  from: string;

  /** The square the piece moved to (e.g. "e4") */
  to: string;

  /** Optional promotion piece (defaults to 'q' for a pawn reaching last rank) */
  promotion?: 'q' | 'r' | 'b' | 'n';
}

/**
 * Represents the tailored view of a game sent to a client player.
 * Contains all data needed to render the board and game context.
 */
export interface Link {
  /** Unique identifier for this game session */
  id: string;

  /** Current FEN string describing the complete board state */
  fen: string;

  /** The color this player is assigned to play as */
  color: 'white' | 'black';

  /** Status of the game lifecycle */
  status: 'active' | 'waiting' | 'finished';

  /** True if a draw offer is currently pending on this turn */
  pendingDraw: boolean;

  /** Sequential move history in standard algebraic notation (SAN) */
  moveHistory: string[];

  /** The most recent move played, useful for board highlights */
  lastMove?: Move;

  /** Details about the opponent player, if any */
  opponent?: {
    /** The opponent's username */
    username: string;

    /** True if the opponent is currently connected to the game */
    connected: boolean;
  };
}
