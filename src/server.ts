import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import { registerChessSockets } from "@/sockets/chessSockets";
import { sessionMiddleware } from "@/middleware/sessionStore";
import { rateLimitMiddleware } from "@/middleware/rateLimiter";

const PORT = process.env.PORT || 3000;

// Create Express app for health endpoint
const app = express();
const httpServer = createServer(app);

// Health check endpoint for Docker and Render.io
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

const io = new Server(httpServer, {
    cors: {
        origin: "*", // Frontend URL or '*' for all origins
    },
});

// middleware
io.use(sessionMiddleware);
io.use(rateLimitMiddleware);

// Register the chess socket handlers
registerChessSockets(io);

httpServer.listen(PORT, () => {
    console.log(`🚀 ChessLink WebSocket server running on port ${PORT}`);
    console.log(`📡 Health check available at http://localhost:${PORT}/health`);
});