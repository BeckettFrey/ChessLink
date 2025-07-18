// File: src/gameManager/types.ts
import { Game, Move, Color } from "@/types"

export interface GameManagerAPI {
 // Connection Handling
 connect(playerId: string): Game | undefined;
 disconnect(playerId: string): Game | undefined;

 // Lobby Handling
 createGame(playerId: string, color: Color): Game | undefined;
 joinGame(playerId: string, gameId: string): Game | undefined;
 getAllGames(): Game[];

 // Game Handling
 offerDraw(playerId: string): Game | undefined;
 acceptDraw(playerId: string): Game | undefined;
 resign(playerId: string): Game | undefined;
 makeMove(playerId: string, move: Move): Game | undefined;
}
