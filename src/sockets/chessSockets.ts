// File: src/sockets/chessSockets.ts
import { Server, Socket } from 'socket.io';
import {
    SanitizedGame,
    Color,
    Move,
    Game,
    ChessLink,
} from '@/types';

import { GameManager, StateSyncError } from '@/gameManager';

const gameManager = new GameManager(100000, 100000);

const timerMap = new Map<string, NodeJS.Timeout>(); // userId -> disconnect timer

const socketMap = new Map<string, string>(); // userId -> socketId

const userMap = new Map<string, string>(); // userId -> username (for sanitization)

/**
 * Emits game state updates to connected players with their color-specific view
 */
function emitGame(io: Server, game: Game) {
    const sanitizedPlayers = {
        white: game.players.white
            ? {
                connected: game.players.white.connected,
                username: userMap.get(game.players.white.id) || 'Anonymous',
            }
            : undefined,
        black: game.players.black
            ? {
                connected: game.players.black.connected,
                username: userMap.get(game.players.black.id) || 'Anonymous',
            }
            : undefined,
    };

    for (const color of ['white', 'black'] as const) {
        // Get the player information for the current color
        const player = game.players[color];
        if (!player) continue;
        // Get the user ID and connection status
        const userId = player.id;
        const connected = player.connected;
        // Only emit if the player is connected
        if (!userId || !connected) continue;
        // Get the socket ID
        const socketId = socketMap.get(userId);
        // Can't emit if the socket is not connected
        if (!socketId) continue;
        const chessLink: ChessLink = {
            ...game,
            players: sanitizedPlayers,
            color,
        };

        io.to(socketId).emit('updateChessLink', chessLink);
    }
}

/**
 * Removes sensitive player data from games for lobby display
 */
function sanitizeGames(games: Game[]): SanitizedGame[] {
    return games.map((game) => ({
        ...game,
        players: {
            white: game.players.white
                ? {
                      connected: game.players.white.connected,
                      username: userMap.get(game.players.white?.id) || 'Anonymous',
                  }
                : undefined,
            black: game.players.black
                ? {
                      connected: game.players.black.connected,
                      username: userMap.get(game.players.black?.id) || 'Anonymous',
                  }
                : undefined,
        },
    }));
}

/**
 * Registers all chess-related socket event handlers
 */
export function registerChessSockets(io: Server) {
    io.on('connection', (socket: Socket) => {
        // Extract userId from data
        const userId = socket.data.userId as string;
        socketMap.set(userId, socket.id);

        // Defaults later to 'Anonymous' if not provided
        if (socket.data.username) {
            userMap.set(userId, socket.data.username as string);
        }

        const game = gameManager.connect(userId);
        if (game) {
            // Clear any existing disconnect timer
            const existingTimer = timerMap.get(userId);
            if (existingTimer) {
                clearTimeout(existingTimer);
                timerMap.delete(userId);
            }
            emitGame(io, game);
        } else {
            const games = gameManager.getAllGames();
            socket.emit('updateLobby', sanitizeGames(games));
        }

    socket.on('disconnect', () => {
        const userId = socket.data.userId as string;
        socketMap.delete(userId);
        userMap.delete(userId);
        // Start a timer to handle potential reconnection
        try {
            const userId = socket.data.userId as string;
            const game = gameManager.disconnect(userId);
            if (game) {
                if (!game.players.white?.connected && !game.players.black?.connected) {
                    game.outcome = {
                        winner: game.players.white?.connected ? 'white' : game.players.black?.connected ? 'black' : undefined,
                        reason: 'resignation',
                    };
                    emitGame(io, game);
                    gameManager.eraseGame(game);
                    const games = gameManager.getAllGames();
                    io.emit('updateLobby', sanitizeGames(games));
                    return;
                }
                // Set a 5-second timer to finalize disconnection if not reconnected
                const timer = setTimeout(() => {
                    gameManager.disconnect(userId);
                    timerMap.delete(userId);
                    const games = gameManager.getAllGames();
                    io.emit('updateLobby', sanitizeGames(games));
                }, 5000); // 5 seconds to reconnect
                timerMap.set(userId, timer);
                emitGame(io, game);
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error handling disconnect:', error);
            }
        }
    });

    socket.on('requestLobby', () => {
        const games = gameManager.getAllGames();
        socket.emit('updateLobby', sanitizeGames(games));
    });

    socket.on('createGame', (color: Color) => {
        try {
            const game = gameManager.createGame(socket.data.userId as string, color);
            if (game) {
                emitGame(io, game);
                io.emit('updateLobby', sanitizeGames(gameManager.getAllGames()));
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error creating game:', error);
            }
        }
    });

    socket.on('joinGame', (gameId: string) => {
        try {
            const game = gameManager.joinGame(socket.data.userId as string, gameId);
            if (game) {
                emitGame(io, game);
                const games = gameManager.getAllGames();
                io.emit('updateLobby', sanitizeGames(games));
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error joining game:', error);
            }
        }
    });

    socket.on('resign', () => {
        try {
            gameManager.resign(socket.data.userId as string);
            const game = gameManager.disconnect(socket.data.userId as string);
            if (game) {
                emitGame(io, game);
                gameManager.eraseGame(game);
                io.emit('updateLobby', sanitizeGames(gameManager.getAllGames()));
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error resigning from game:', error);
            }
        }
    });

    socket.on('acceptDraw', () => {
        try {
            const game = gameManager.acceptDraw(socket.data.userId as string);
            if (game) {
                emitGame(io, game);
                gameManager.eraseGame(game);
                io.emit('updateLobby', sanitizeGames(gameManager.getAllGames()));
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error accepting draw:', error);
            }
        }
    });

    socket.on('offerDraw', () => {
        try {
            const game = gameManager.offerDraw(socket.data.userId as string);
            if (game) {
                emitGame(io, game);
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error offering draw:', error);
            }
        }
    });

    socket.on('makeMove', (move: Move) => {
        try {
            const game = gameManager.makeMove(socket.data.userId as string, move);
            if (game) {
                emitGame(io, game);
                io.emit('updateLobby', sanitizeGames(gameManager.getAllGames()));
                if (game.outcome) {
                    gameManager.eraseGame(game);
                }
            }
        } catch (error) {
            if (error instanceof StateSyncError) {
                // handle known potential state sync errors gracefully
                console.error('State synchronization error:', error);
            } else {
                console.error('Leaked Error making move:', error);
            }
        }
    });
});
}