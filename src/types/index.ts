// File: src/types/index.ts
export type Player = {
   id: string;
   connected: boolean;
};

export type SanitizedPlayer = Omit<Player, 'id'> & {
    username: string;
};

export type Color = 'white' | 'black';

export type Outcome = {
   winner?: Color;
   reason: 'checkmate' | 'resignation' | 'timeout' | 'draw' | 'stalemate' | 'insufficient_material' | 'threefold_repetition';
}

export type Move = {
  from: string;
  to: string;
  promotion?: string;
};

export type Game = {
   id: string;
   createdAt: number;
   updatedAt: number;
   fen: string;
   players: {
       white?: Player;
       black?: Player;
   };
   moves: Move[];
   joinable: boolean;
   drawOfferedBy?: Color;
   outcome?: Outcome;
};

export type SanitizedGame = Omit<Game, 'players'> & {
 players: {
   white?: SanitizedPlayer;
   black?: SanitizedPlayer;
 };
};

export type ChessLink = Omit<Game, 'players'> & {
 players: {
   white?: SanitizedPlayer;
   black?: SanitizedPlayer;
 };
 color: Color;
};
