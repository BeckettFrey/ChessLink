# **ChessLink \- ChessSockets API**

* **See [types](src/types/index.ts) for the declarations and documentation corresponding to the reusable aliases and structures referenced.**  
* **Remember that a socket is one instance of a server client connection s.t. events can be emitted both ways. These docs consolidate the two-way emissions under two categories.**  
* ***Server API*** **is the interface by which the server interacts with the client. Read more about socket.io's server API [here](https://socket.io/docs/v4/server-api/).**  
* ***Client API*** **is the interface by which the client interacts with the server. Read more about socket.io's client API [here](https://socket.io/docs/v4/client-api).**

---

## **Server API (Server → Client Events)**

### **`updateLobby` ( SanitizedGame\[\] )**

**Delivers the full set of games for the lobby. Sent to all clients or specific client requesting lobby updates.**

### **`updateChessLink` ( ChessLink )**

**Delivers the instance of a game tailored to the respective player. Contains the game state with player-specific color information.**

---

## **Client API (Client → Server Events)**

### **`connection` ( )**

**Triggered automatically when the client establishes a socket connection with the server. Used to initialize the socket session, map user to socket, and either rejoin an existing game or receive lobby updates.**

### **`disconnect` ( )**

**Triggered automatically when the client's socket disconnects from the server (whether intentionally or due to network issues). The server handles cleanup, updates game states, and starts a 5-second reconnection grace period. If both players disconnect, the game ends in resignation.**

### **`requestLobby` ( )**

**Client asks the server to send the current list of active games. Results in the server emitting an `updateLobby` event back to the requesting client.**

### **`createGame` ( Color )**

**Client requests the server to create a new game instance, specifying their desired color ('white' or 'black'). The server responds by creating the game and sending an `updateChessLink` event tailored to this player, plus broadcasts `updateLobby` to all clients.**

### **`joinGame` ( gameId: string )**

**Client requests to join an existing game in the lobby by providing the game's unique id as a string. The server then assigns the player to the game, updates both players with `updateChessLink`, and broadcasts `updateLobby` to all clients.**

### **`resign` ( )**

**Client signals they wish to resign from their current game. The server processes the resignation, declares the opponent as the winner, updates both players' game states, erases the game, and broadcasts lobby updates.**

### **`acceptDraw` ( )**

**Client accepts a pending draw offer from their opponent. The server finalizes the game as a draw, updates both players' game states with `updateChessLink`, erases the game, and broadcasts `updateLobby` to all clients.**

### **`offerDraw` ( )**

**Client proposes a draw to their opponent. The server marks the game as having a pending draw offer and notifies the opponent via `updateChessLink` so the opponent can optionally respond.**

### **`makeMove` ( Move )**

**Client submits a move attempt by sending a Move object (containing from, to, and optional promotion). The server validates the move using the game state, updates the board if valid, broadcasts the updated state to both players via `updateChessLink`, and sends `updateLobby` to all clients. If the move results in game completion, the game is erased.**

---

## **Notes**

* **All server operations include error handling for `StateSyncError` and general errors**  
* **User mapping maintains username information for sanitization purposes**  
* **Disconnect handling includes a 5-second reconnection grace period**  
* **Game states are automatically cleaned up when games conclude**

