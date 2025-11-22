# ♟️ ChessLink
[![Docs](https://img.shields.io/badge/docs-📚-blue?style=flat-square)](docs/ChessLink%20WebSockets%20API.md)
[![CI](https://github.com/BeckettFrey/ChessLink/actions/workflows/test.yaml/badge.svg)](https://github.com/BeckettFrey/ChessLink/actions/workflows/test.yaml)

**ChessLink** is a real-time WebSocket API for facilitating chess game interactions, it is minimal, TypeScript-driven, and designed for a lightweight client and rapid integration.

## Tech Stack
* [Node.js](https://nodejs.org/) with [TypeScript](https://www.typescriptlang.org/)
* [Socket.io](https://socket.io/) for real-time WebSocket communication
* [Docker](https://docs.docker.com/) for containerization and deployment
* [Jest](https://jestjs.io/) for testing
* [Render.io](https://render.com/) for production deployment

## Faith-Based (Lightweight Client Approach)

ChessLink is built on a “faith-based” client model; meaning the client doesn’t need to implement any chess
logic, no move validation, check detection, turn management, or game state calculations. All of
that is handled server-side.

Clients simply trust (“have faith in”) the server’s authoritative game updates and emit basic
intents such as moves or lobby actions. This keeps the client extremely lightweight, reduces the
chance of desynchronization, and ensures consistent rule enforcement across all players.

Also note that excessive api requests can be throttled from the frontend if some client side logic adds an intermediate validation layer [as implemented in the client demo](https://chess-link-client.vercel.app/), this becomes more evident with scale.

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

## Integration Example
```typescript
import io from 'socket.io-client';

const socket = io('your-chesslink-api-url');

// Join game
socket.emit('joinGame', gameId);

// Handle game updates
socket.on('updateChessLink', (chessLink) => {
  // Update state accordingly
  setChessLink(chessLink);
});

// Make a move
socket.emit('makeMove', { from: 'e2', to: 'e4' })
```

See [documentation]([![Docs](docs/ChessLink%20WebSockets%20API.md) for a more thorough introduction to the API outlining the full set of socket events.
