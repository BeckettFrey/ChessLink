# GameManager

This document outlines the API for the `GameManager`, a standalone in-memory chess game manager that orchestrates game creation, joining, move processing, draw offers, and cleanup using `chess.js`. It supports WebSocket or REST interfaces via user-specific `Link` objects and integrates with a `CleaningService` for stale game removal.

See `@types` for declarations and documentation of `Game`, `Color`, `Link`, and `Move`.

## Core Responsibilities

- **Maintain userMap**: `Map<userId, gameId>` to track which game each user is in.
- **Maintain gameMap**: `Map<gameId, Game>` for live games.
- **Interface with CleaningService**: Auto-cleans stale games based on `createdAt`/`updatedAt`.
- **Move Validation & Execution**: Uses `chess.js` to validate moves, update FEN, move history, `lastMove`, and clean up concluded games.
- **Support for Game Actions**: Joining, resigning, offering draws, and handling reconnects.

## Public API

### `createGame(userId: string, color: Color) => Game`
- Creates a new game where `userId` chooses `white` or `black`.
- Initializes FEN to standard starting position.
- Sets `joinable: true` for others to join.
- Adds to `gameMap` and sets `userMap[userId] -> gameId`.
- **Throws**: If `color` is invalid.

### `joinGame(userId: string, gameId: string)`
- Allows a user to join an existing joinable game.
- Assigns the user to the empty color slot (`white` or `black`).
- Sets `joinable: false` when both players have joined.
- Updates `updatedAt`.
- **Throws**: If game not found or already full.

### `makeMove(userId: string, move: Move)`
- Processes a chess move using `chess.js`.
- Validates the move and updates `fen`, `moveHistory`, `lastMove`, clears `offeredDraw`, and bumps `updatedAt`.
- Deletes game and cleans `userMap` if `isGameOver` is triggered.
- **Throws**: On invalid moves.

### `offerDraw(userId: string)`
- Marks the game as having a pending draw offer by `userId`.
- Updates `updatedAt`.
- **Throws**: If user not in a game or a draw is already pending.

### `getLink(userId: string) => Link | null`
- Returns a `Link` object tailored to the user’s current game.
- Includes their `color`, `fen`, `moveHistory`, `lastMove`, pending draw state, game status (`waiting` or `active`), and opponent connectivity.
- Returns `null` if user is not in a game.

### `deleteGame(gameId: string)`
- Deletes a game from `gameMap` and removes associated `userMap` entries.
- Handles deletion gracefully if game is already gone.
- Ensures players are fully removed from `userMap`.

### `detachPlayer(userId: string) => gameId | undefined`
- Removes a player from `userMap` (e.g., on disconnect).
- Returns the `gameId` they were detached from or `undefined` if not in a game.

### `attachPlayer(userId: string, gameId: string) => Game | undefined`
- Re-attaches a user to a game, updating `userMap`.
- Used for reconnect scenarios.
- Returns the `Game` object or `undefined` if `gameId` does not exist.

## Edge Cases & Guarantees

- **Multiple Game Creation**: Creating a new game drops the user’s old game participation, mapping them only to the new game.
- **Joining Twice**: Attempting to join a game twice does not throw.
- **Pawn Promotions**: `makeMove` supports promotions to `q`, `n`, `r`, `b`; throws on invalid promotion pieces.
- **Draw Offers**: Only one active draw offer allowed; must be accepted externally.
- **Game Conclusion**: Fully deletes games on checkmate or stalemate, cleaning `userMap`.
- **Link Behavior**: `getLink` shows `pendingDraw: true` for opponent, `false` for offerer.
- **Stale Game Cleanup**: `CleaningService` auto-removes idle games.
