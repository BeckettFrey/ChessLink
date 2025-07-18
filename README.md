# ♟️ ChessLink
[![Tests](https://img.shields.io/github/workflow/status/BeckettFrey/ChessLink/Node.js%20CI?label=tests&logo=jest)](https://github.com/BeckettFrey/ChessLink/actions)

**ChessLink** is a real-time WebSocket API for facilitating chess game interactions — minimal, TypeScript-driven, and designed for rapid integration.

> 🧠 This project is a **personal learning exercise** where I explored WebSocket communication patterns, practiced deploying a Node.js server to Render.io, and built a simple TypeScript API for real-time chess gameplay with basic lobby management.

## 🔧 Tech Stack
* [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/)
* [Socket.io](https://socket.io/) for real-time WebSocket communication
* [Docker](https://docs.docker.com/) for containerization and deployment
* [Jest](https://jestjs.io/) for testing
* [Render.io](https://render.com/) for production deployment

## ✅ Features
* Real-time multiplayer chess gameplay via WebSocket connections
* Basic lobby system for game discovery and matchmaking
* Game state management with move validation
* Reconnection handling with 5-second grace period
* Draw offers and resignation support
* Player-specific game state updates
* Dockerized for deployment consistency
* TypeScript implementation with type definitions

## 🚀 Quickstart

### Local Development
```bash
# Clone the repository
git clone https://github.com/BeckettFrey/ChessLink.git
cd ChessLink

# Install dependencies
npm install

# Run in development mode
npm run dev
```

The server will start on `http://localhost:3000` with health check available at `/health`.

### 🐳 Docker Setup
```bash
# Build and run with Docker
docker build -t chesslink .
docker run -p 3000:3000 chesslink

# Or use Docker Compose
docker-compose up --build
```

## 🧪 Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

Tests are not fully complete but structurally thought out. Test files are located in:
```
src/
├── gameManager/__tests__/
├── middleware/__tests__/
├── services/__tests__/
└── sockets/__tests__/
```

## 🎯 Use Cases
Useful for developers who need:
* **Simple chess integration** — Basic API for chess functionality
* **Minimal lobby setup** — Straightforward multiplayer chess implementation
* **Real-time game state** — Synchronized gameplay across clients
* **Learning reference** — Example implementation for similar projects

## 📚 Learning Achievements
This repository documents my hands-on exploration of real-time application development. Through building ChessLink, I:

* **Learned WebSocket Communication**: Implemented bidirectional real-time communication with event handling and state synchronization
* **Practiced Production Deployment**: Successfully containerized and deployed a TypeScript application to Render.io
* **Explored TypeScript APIs**: Developed a structured API with type definitions and basic error handling
* **Experimented with Game State Management**: Created systems for handling game states, disconnections, and player interactions
* **Applied Development Practices**: Used Docker for consistency, Jest for testing, and organized project structure

## 🔗 Integration Example
```typescript
import io from 'socket.io-client';

const socket = io('your-chesslink-api-url');

// Join lobby
socket.emit('requestLobby');

// Handle game updates
socket.on('updateChessLink', (gameState) => {
  // Update your chess board UI
  updateChessBoard(gameState.board);
});

// Make a move
socket.emit('makeMove', { from: 'e2', to: 'e4